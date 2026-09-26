/**
 * Google Drive Cloud Sync Service.
 * Uploads captured surveillance photos (.jpg) and activity videos (.webm / .mp4)
 * directly to Google Drive Folder: 1XOOsBa34u3CQxWH4t8C8xCADWrOIfUYo
 * via a free, lightweight Google Apps Script Web App bridge.
 */

const DEFAULT_FOLDER_ID = '1XOOsBa34u3CQxWH4t8C8xCADWrOIfUYo';
const STORAGE_KEY_WEBHOOK = 'smart_surveillance_gdrive_webhook';
const STORAGE_KEY_ENABLED = 'smart_surveillance_gdrive_enabled';

class DriveService {
  constructor() {
    this.folderId = DEFAULT_FOLDER_ID;
    this.webhookUrl = localStorage.getItem(STORAGE_KEY_WEBHOOK) || '';
    this.isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
  }

  setWebhookUrl(url) {
    this.webhookUrl = url ? url.trim() : '';
    localStorage.setItem(STORAGE_KEY_WEBHOOK, this.webhookUrl);
  }

  setEnabled(enabled) {
    this.isEnabled = Boolean(enabled);
    localStorage.setItem(STORAGE_KEY_ENABLED, String(this.isEnabled));
  }

  getAppsScriptCode() {
    return `// Copy & paste this 15-line script into https://script.google.com
// 1. Click "New Project"
// 2. Paste code below
// 3. Click "Deploy" -> "New deployment" -> Select "Web app"
// 4. "Execute as": Me | "Who has access": Anyone
// 5. Copy Web App URL into Smart Surveillance Dashboard!

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = "${this.folderId}";
    var folder = DriveApp.getFolderById(folderId);
    
    var decoded = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(decoded, data.mimeType, data.filename);
    var file = folder.createFile(blob);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: file.getId(),
      fileUrl: file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }

  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async uploadFile({ blob, dataUrl, filename, mimeType }) {
    if (!this.isEnabled || !this.webhookUrl) {
      return { success: false, reason: 'Google Drive Sync is disabled or Webhook URL missing' };
    }

    try {
      let base64Data = '';
      if (dataUrl) {
        base64Data = dataUrl.split(',')[1];
      } else if (blob) {
        base64Data = await this.blobToBase64(blob);
      }

      const payload = {
        filename,
        mimeType: mimeType || (blob ? blob.type : 'image/jpeg'),
        base64Data,
        folderId: this.folderId
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Google Apps Script CORS preference
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      return {
        success: result.status === 'success',
        fileUrl: result.fileUrl,
        filename
      };
    } catch (err) {
      console.error('Google Drive Upload Error:', err);
      return { success: false, error: err.message };
    }
  }

  async testUpload() {
    if (!this.webhookUrl) {
      throw new Error('Please enter a valid Google Apps Script Webhook URL first.');
    }

    // Create a 1x1 test JPEG pixel
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(0, 0, 10, 10);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const testFilename = `surveillance_test_${Date.now()}.jpg`;
    return await this.uploadFile({
      dataUrl,
      filename: testFilename,
      mimeType: 'image/jpeg'
    });
  }
}

export const driveService = new DriveService();
