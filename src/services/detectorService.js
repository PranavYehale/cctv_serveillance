/**
 * Detector Service using TensorFlow.js COCO-SSD / MediaPipe for real-time person detection,
 * canvas bounding box rendering, live stats calculation, and burst photo generation.
 */

let tfLoaded = false;
let cocoModel = null;

export class DetectorService {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.loadError = null;
  }

  async loadModel() {
    if (this.model) return this.model;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.model;
    }

    this.isLoading = true;
    try {
      // Load TF.js & COCO-SSD dynamically if needed or from window/npm
      if (window.cocoSsd) {
        this.model = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } else {
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        await import('@tensorflow/tfjs-backend-webgl');
        await import('@tensorflow/tfjs-core');
        this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      }
      this.isLoading = false;
      console.log('COCO-SSD Human Detection Model loaded successfully');
      return this.model;
    } catch (err) {
      console.error('Failed to load COCO-SSD model via module, attempting fallback loader:', err);
      try {
        // Fallback CDN loader for standalone browser mode
        await this.loadCDNModel();
        this.isLoading = false;
        return this.model;
      } catch (fallbackErr) {
        this.isLoading = false;
        this.loadError = fallbackErr.message || 'Model loading error';
        throw fallbackErr;
      }
    }
  }

  async loadCDNModel() {
    if (window.cocoSsd) {
      this.model = await window.cocoSsd.load();
      return;
    }
    return new Promise((resolve, reject) => {
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
        script2.onload = async () => {
          try {
            this.model = await window.cocoSsd.load();
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        script2.onerror = reject;
        document.head.appendChild(script2);
      };
      script1.onerror = reject;
      document.head.appendChild(script1);
    });
  }

  async detect(videoElement, confidenceThreshold = 0.6) {
    if (!this.model || !videoElement || videoElement.readyState < 2) {
      return { people: [], count: 0, hasHuman: false };
    }

    try {
      const predictions = await this.model.detect(videoElement);
      // Filter predictions for 'person' class above confidence threshold
      const people = predictions.filter(
        pred => pred.class === 'person' && pred.score >= confidenceThreshold
      );

      return {
        people,
        count: people.length,
        hasHuman: people.length > 0,
        rawPredictionsCount: predictions.length
      };
    } catch (err) {
      console.error('Detection frame error:', err);
      return { people: [], count: 0, hasHuman: false };
    }
  }

  drawOverlay(canvas, videoElement, people, confidenceThreshold, isRecording = false) {
    if (!canvas || !videoElement) return;

    const ctx = canvas.getContext('2d');
    const width = videoElement.videoWidth || canvas.width;
    const height = videoElement.videoHeight || canvas.height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear previous drawing
    ctx.clearRect(0, 0, width, height);

    // Draw Timestamp HUD in top-right corner
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0').slice(0, 2)}`;
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    ctx.save();
    ctx.font = '14px "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(width - 220, 12, 208, 48);

    ctx.fillStyle = '#00ff66';
    ctx.fillText(`CAM-01 LIVE`, width - 210, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${dateStr} ${timeStr}`, width - 210, 50);

    // Recording Indicator Badge
    if (isRecording) {
      ctx.fillStyle = 'rgba(218, 54, 51, 0.85)';
      ctx.fillRect(16, 16, 130, 32);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(32, 32, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('REC 3S-BUFFER', 44, 36);
    }
    ctx.restore();

    // Draw Bounding Boxes for detected humans
    people.forEach((person, idx) => {
      const [x, y, w, h] = person.bbox;
      const confidence = Math.round(person.score * 100);

      ctx.save();

      // Bounding box outline
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;

      // Draw box
      ctx.strokeRect(x, y, w, h);

      // Draw Corner Accents
      const cornerLength = Math.min(w, h) * 0.2;
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 4;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLength, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLength);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLength);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerLength, y + h);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLength, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerLength);
      ctx.stroke();

      // Label background banner
      const labelText = `PERSON #${idx + 1} (${confidence}%)`;
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(x, Math.max(0, y - 28), textWidth + 16, 26);

      ctx.fillStyle = '#00ff66';
      ctx.fillText(labelText, x + 8, Math.max(18, y - 10));

      ctx.restore();
    });
  }

  /**
   * Captures 3-4 consecutive photos at ~350ms intervals.
   */
  async capturePhotoBurst(videoElement, count = 4, delayMs = 350, confidence = 0.8, peopleCount = 1) {
    if (!videoElement || videoElement.readyState < 2) return [];

    const width = videoElement.videoWidth || 1280;
    const height = videoElement.videoHeight || 720;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d');

    const photos = [];

    for (let i = 1; i <= count; i++) {
      // Draw frame to offscreen canvas
      ctx.drawImage(videoElement, 0, 0, width, height);

      // Add camera overlay timestamp on captured photo
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, height - 35, 260, 25);
      ctx.fillStyle = '#00ff66';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(`[BURST ${i}/${count}] ${timeStr}`, 18, height - 18);
      ctx.restore();

      const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.92);
      
      // Convert DataURL to Blob for storage
      const blob = await new Promise(resolve => {
        offscreenCanvas.toBlob(b => resolve(b), 'image/jpeg', 0.92);
      });

      photos.push({
        index: i,
        dataUrl,
        blob,
        confidence,
        peopleCount,
        timestamp: new Date()
      });

      if (i < count) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    return photos;
  }
}

export const detectorService = new DetectorService();
