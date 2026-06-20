// ============================================
// Google Drive Service — File Upload & Management
// ============================================
// Uses OAuth tokens from Better Auth's account table
// to upload/manage files in Google Drive per-user.

import { google, drive_v3 } from "googleapis";
import { db } from "@/db";
import { account } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ============================================
// Types
// ============================================

interface UploadFileParams {
  fileName: string;
  mimeType: string;
  body: Buffer;
  folderId: string;
}

interface UploadResult {
  fileId: string;
  webViewLink: string;
}

interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
}

// ============================================
// GoogleDriveService
// ============================================

export class GoogleDriveService {
  private userId: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accountId: string | null = null;
  private drive: drive_v3.Drive | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  /**
   * Load OAuth tokens from the account table and
   * initialize the Google Drive client.
   */
  async initialize(): Promise<void> {
    const userAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, this.userId),
        eq(account.providerId, "google")
      ),
    });

    if (!userAccount) {
      throw new GoogleDriveError(
        "NO_GOOGLE_ACCOUNT",
        "User does not have a linked Google account"
      );
    }

    if (!userAccount.accessToken) {
      throw new GoogleDriveError(
        "NO_ACCESS_TOKEN",
        "Google account has no access token"
      );
    }

    this.accessToken = userAccount.accessToken;
    this.refreshToken = userAccount.refreshToken;
    this.accountId = userAccount.id;

    this.drive = this.createDriveClient(this.accessToken);
  }

  /**
   * Create an authenticated Drive client with the given access token.
   */
  private createDriveClient(accessToken: string): drive_v3.Drive {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // ----------------------------------------
  // Token Refresh
  // ----------------------------------------

  /**
   * Refresh the access token using the refresh token,
   * update the database, and re-initialize the Drive client.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new GoogleDriveError(
        "NO_REFRESH_TOKEN",
        "Cannot refresh: no refresh token available"
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: this.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token;

      if (!newAccessToken) {
        throw new GoogleDriveError(
          "REFRESH_FAILED",
          "Token refresh returned no access token"
        );
      }

      // Update token in database
      if (this.accountId) {
        await db
          .update(account)
          .set({
            accessToken: newAccessToken,
            accessTokenExpiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(account.id, this.accountId));
      }

      this.accessToken = newAccessToken;
      this.drive = this.createDriveClient(newAccessToken);

      console.log(`[GoogleDrive] Token refreshed for user ${this.userId}`);
    } catch (error) {
      console.error("[GoogleDrive] Token refresh failed:", error);
      throw new GoogleDriveError(
        "REFRESH_FAILED",
        `Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a Drive API call with automatic token refresh on 401.
   */
  private async withAutoRefresh<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      // Check if it's a 401 (token expired)
      const statusCode = (error as { code?: number })?.code;
      if (statusCode === 401) {
        console.log("[GoogleDrive] Access token expired, refreshing...");
        await this.refreshAccessToken();
        // Retry the operation with new token
        return await fn();
      }
      throw error;
    }
  }

  // ----------------------------------------
  // Folder Management
  // ----------------------------------------

  /**
   * Find a folder by name under a given parent, or create it if it doesn't exist.
   */
  async getOrCreateFolder(
    folderName: string,
    parentId?: string
  ): Promise<string> {
    if (!this.drive) throw new GoogleDriveError("NOT_INITIALIZED", "Call initialize() first");

    return this.withAutoRefresh(async () => {
      const drive = this.drive!;

      // Search for existing folder
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const listResponse = await drive.files.list({
        q: query,
        fields: "files(id, name)",
        spaces: "drive",
      });

      const existingFolder = listResponse.data.files?.[0];
      if (existingFolder?.id) {
        return existingFolder.id;
      }

      // Create new folder
      const createResponse = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: parentId ? [parentId] : undefined,
        },
        fields: "id",
      });

      const folderId = createResponse.data.id;
      if (!folderId) {
        throw new GoogleDriveError(
          "FOLDER_CREATE_FAILED",
          `Failed to create folder: ${folderName}`
        );
      }

      console.log(`[GoogleDrive] Created folder "${folderName}" (${folderId})`);
      return folderId;
    });
  }

  /**
   * Ensure the date-based folder structure exists:
   * Unboxing / YYYY / MM
   * Returns the month folder ID.
   */
  async ensureDateFolder(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Unboxing (root)
    const rootFolderId = await this.getOrCreateFolder("Unboxing");

    // Unboxing / 2026
    const yearFolderId = await this.getOrCreateFolder(year, rootFolderId);

    // Unboxing / 2026 / 06
    const monthFolderId = await this.getOrCreateFolder(month, yearFolderId);

    return monthFolderId;
  }

  // ----------------------------------------
  // File Upload
  // ----------------------------------------

  /**
   * Upload a file to Google Drive and make it publicly viewable.
   */
  async uploadFile(params: UploadFileParams): Promise<UploadResult> {
    if (!this.drive) throw new GoogleDriveError("NOT_INITIALIZED", "Call initialize() first");

    return this.withAutoRefresh(async () => {
      const drive = this.drive!;
      const { fileName, mimeType, body, folderId } = params;

      // Upload file
      const { Readable } = await import("stream");
      const stream = Readable.from(body);

      const uploadResponse = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: "id, webViewLink",
      });

      const fileId = uploadResponse.data.id;
      if (!fileId) {
        throw new GoogleDriveError(
          "UPLOAD_FAILED",
          `Upload returned no file ID for: ${fileName}`
        );
      }

      // Set permission: anyone with link can view
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      const webViewLink =
        uploadResponse.data.webViewLink ||
        `https://drive.google.com/file/d/${fileId}/view`;

      console.log(
        `[GoogleDrive] Uploaded "${fileName}" (${fileId}) → ${webViewLink}`
      );

      return { fileId, webViewLink };
    });
  }

  // ----------------------------------------
  // File Delete
  // ----------------------------------------

  /**
   * Delete a file from Google Drive by its file ID.
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) throw new GoogleDriveError("NOT_INITIALIZED", "Call initialize() first");

    return this.withAutoRefresh(async () => {
      const drive = this.drive!;
      try {
        await drive.files.delete({ fileId });
        console.log(`[GoogleDrive] Deleted file ${fileId}`);
      } catch (error: unknown) {
        const statusCode = (error as { code?: number })?.code;
        if (statusCode === 404) {
          console.warn(`[GoogleDrive] File ${fileId} not found (already deleted?)`);
          return;
        }
        throw error;
      }
    });
  }

  // ----------------------------------------
  // File Metadata
  // ----------------------------------------

  /**
   * Get metadata for a file in Google Drive.
   */
  async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    if (!this.drive) throw new GoogleDriveError("NOT_INITIALIZED", "Call initialize() first");

    return this.withAutoRefresh(async () => {
      const drive = this.drive!;

      const response = await drive.files.get({
        fileId,
        fields: "id, name, mimeType, size, webViewLink",
      });

      return {
        id: response.data.id || fileId,
        name: response.data.name || "",
        mimeType: response.data.mimeType || "",
        size: response.data.size || "0",
        webViewLink:
          response.data.webViewLink ||
          `https://drive.google.com/file/d/${fileId}/view`,
      };
    });
  }

  // ----------------------------------------
  // Storage Quota
  // ----------------------------------------

  /**
   * Get the user's Google Drive storage quota info.
   */
  async getStorageQuota(): Promise<{
    usageBytes: number;
    limitBytes: number;
  }> {
    if (!this.drive) throw new GoogleDriveError("NOT_INITIALIZED", "Call initialize() first");

    return this.withAutoRefresh(async () => {
      const drive = this.drive!;

      const response = await drive.about.get({
        fields: "storageQuota",
      });

      const quota = response.data.storageQuota;
      return {
        usageBytes: parseInt(quota?.usage || "0", 10),
        limitBytes: parseInt(quota?.limit || "0", 10),
      };
    });
  }
}

// ============================================
// Custom Error
// ============================================

export class GoogleDriveError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GoogleDriveError";
    this.code = code;
  }
}
