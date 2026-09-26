/**
 * Storage Service using browser IndexedDB for persistent storage of photos,
 * recorded videos, and surveillance activity logs.
 */

const DB_NAME = 'SmartSurveillanceDB';
const DB_VERSION = 1;

class StorageService {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for captured photos
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
          photoStore.createIndex('filename', 'filename', { unique: false });
        }

        // Store for activity video recordings
        if (!db.objectStoreNames.contains('videos')) {
          const videoStore = db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
          videoStore.createIndex('timestamp', 'timestamp', { unique: false });
          videoStore.createIndex('filename', 'filename', { unique: false });
        }

        // Store for activity logs
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // --- Helper Date Formatter ---
  formatDateForFilename(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
  }

  formatTimeForLog(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // --- Photo Operations ---
  async savePhoto({ blob, dataUrl, confidence, peopleCount, index, timestamp = new Date() }) {
    const db = await this.getDB();
    const dateStr = this.formatDateForFilename(timestamp);
    const filename = `person_${dateStr}_${index}.jpg`;

    const record = {
      filename,
      timestamp: timestamp.getTime(),
      displayTime: this.formatTimeForLog(timestamp),
      blob,
      dataUrl,
      confidence: Math.round(confidence * 100),
      peopleCount,
      size: blob ? blob.size : 0
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const request = store.add(record);

      request.onsuccess = (e) => {
        resolve({ ...record, id: e.target.result });
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllPhotos() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Most recent first
      const results = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deletePhoto(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Video Operations ---
  async saveVideo({ blob, duration, confidence, peopleCount, timestamp = new Date(), fileExtension = 'mp4' }) {
    const db = await this.getDB();
    const dateStr = this.formatDateForFilename(timestamp);
    let ext = fileExtension;
    if (blob && blob.type) {
      if (blob.type.includes('mp4')) ext = 'mp4';
      else if (blob.type.includes('webm')) ext = 'webm';
    }
    const filename = `activity_${dateStr}.${ext}`;

    const record = {
      filename,
      timestamp: timestamp.getTime(),
      displayTime: this.formatTimeForLog(timestamp),
      blob,
      duration: parseFloat(duration.toFixed(1)),
      confidence: Math.round(confidence * 100),
      peopleCount,
      size: blob ? blob.size : 0,
      mimeType: blob ? blob.type : 'video/webm'
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      const request = store.add(record);

      request.onsuccess = (e) => {
        resolve({ ...record, id: e.target.result });
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllVideos() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readonly');
      const store = tx.objectStore('videos');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteVideo(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Log Operations ---
  async addLog({ type, message, meta = {} }) {
    const db = await this.getDB();
    const now = new Date();
    const record = {
      timestamp: now.getTime(),
      displayTime: this.formatTimeForLog(now),
      type, // 'detection', 'recording_start', 'recording_stop', 'system'
      message,
      meta
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const request = store.add(record);

      request.onsuccess = (e) => {
        resolve({ ...record, id: e.target.result });
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllLogs() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('logs', 'readonly');
      const store = tx.objectStore('logs');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async clearLogs() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Bulk Operations & Utilities ---
  async getStorageStats() {
    const photos = await this.getAllPhotos();
    const videos = await this.getAllVideos();

    const photoSize = photos.reduce((acc, p) => acc + (p.size || 0), 0);
    const videoSize = videos.reduce((acc, v) => acc + (v.size || 0), 0);
    const totalBytes = photoSize + videoSize;

    return {
      photoCount: photos.length,
      videoCount: videos.length,
      photoSizeMB: (photoSize / (1024 * 1024)).toFixed(2),
      videoSizeMB: (videoSize / (1024 * 1024)).toFixed(2),
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2)
    };
  }

  downloadBlob(blob, filename) {
    let safeFilename = filename;
    if (blob && blob.type) {
      if (blob.type.includes('mp4') && !safeFilename.endsWith('.mp4')) {
        safeFilename = safeFilename.replace(/(\.[^/.]+$)|$/, '.mp4');
      } else if (blob.type.includes('webm') && !safeFilename.endsWith('.webm')) {
        safeFilename = safeFilename.replace(/(\.[^/.]+$)|$/, '.webm');
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
  }
}

export const storageService = new StorageService();
