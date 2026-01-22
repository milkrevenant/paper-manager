/**
 * Google Drive API Client
 * Handles file upload, download, and folder management
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime: string;
}

interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
}

export class GoogleDriveClient {
  private accessToken: string;

  constructor() {
    this.accessToken = sessionStorage.getItem('google_access_token') || '';
  }

  /**
   * Create folder in user's Drive
   */
  async createFolder(folderName: string, parentId?: string): Promise<string> {
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
    };

    const response = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Find folder by name
   */
  async findFolder(folderName: string): Promise<string | null> {
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search folder: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files?.[0]?.id || null;
  }

  /**
   * Get or create folder structure: /서지관리/{topicName}/
   */
  async ensureFolderPath(topicName: string): Promise<string> {
    // Find or create root folder
    let rootId = await this.findFolder('서지관리');
    if (!rootId) {
      rootId = await this.createFolder('서지관리');
    }

    // Find or create topic folder
    const query = `name='${topicName}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    const data = await response.json();
    if (data.files?.length > 0) {
      return data.files[0].id;
    }

    // Create topic folder
    return await this.createFolder(topicName, rootId);
  }

  /**
   * Upload PDF file to Drive
   */
  async uploadPdf(
    file: File,
    folderId: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    const metadata = {
      name: file.name,
      mimeType: 'application/pdf',
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve({
            fileId: data.id,
            fileName: data.name,
            webViewLink: data.webViewLink || '',
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      xhr.send(formData);
    });
  }

  /**
   * Get file as base64 (for AI analysis)
   */
  async getFileAsBase64(fileId: string): Promise<string> {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * List files in folder
   */
  async listFilesInFolder(folderId: string): Promise<DriveFile[]> {
    const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
    
    const response = await fetch(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }
}

// Export singleton instance creator
export function createDriveClient(): GoogleDriveClient {
  return new GoogleDriveClient();
}
