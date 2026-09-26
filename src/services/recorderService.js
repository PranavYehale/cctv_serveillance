/**
 * Frame-Buffer Video Recorder Service with MP4 Priority.
 * Prioritizes native MP4 (H.264) recording for direct Windows Media Player / QuickTime compatibility,
 * falling back to WebM when MP4 is unavailable in browser.
 */

export class RecorderService {
  constructor() {
    this.isMonitoring = false;
    this.isRecordingActivity = false;

    // Pre-roll Frame Buffer (holds ImageBitmaps for last 3 seconds)
    this.frameBuffer = [];
    this.MAX_PRE_ROLL_FRAMES = 45; // 45 frames @ 15 FPS = 3.0 seconds

    // Recording Canvas & Stream
    this.recCanvas = null;
    this.recCtx = null;
    this.recStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // Activity Timing & Duration Controls
    this.activityStartTime = null;
    this.activityMetadata = null;
    this.tailTimer = null;
    this.fixedDurationTimer = null;
    this.TAIL_DURATION_MS = 2500; // 2.5s tail after human leaves
    this.videoDurationTarget = 'auto'; // 'auto' | 150 (2:30 min)

    this.mimeType = 'video/mp4';
    this.fileExtension = 'mp4';

    // Callbacks
    this.onActivityStart = null;
    this.onActivityComplete = null;
    this.onError = null;
  }

  getBestMimeType() {
    // Prioritize MP4 formats for native Windows Media Player / Mobile compatibility
    const mp4Types = [
      { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
      { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
      { mime: 'video/mp4;codecs=h264', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' }
    ];

    for (const t of mp4Types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t.mime)) {
        return t;
      }
    }

    // Fallback to WebM if browser does not support MP4 MediaRecorder
    const webmTypes = [
      { mime: 'video/webm;codecs=vp9', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' }
    ];

    for (const t of webmTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t.mime)) {
        return t;
      }
    }

    return { mime: 'video/webm', ext: 'webm' };
  }

  startMonitoring(callbacks = {}) {
    this.isMonitoring = true;
    this.isRecordingActivity = false;
    this.clearFrameBuffer();

    this.onActivityStart = callbacks.onActivityStart || null;
    this.onActivityComplete = callbacks.onActivityComplete || null;
    this.onError = callbacks.onError || null;

    const selected = this.getBestMimeType();
    this.mimeType = selected.mime;
    this.fileExtension = selected.ext;
  }

  setVideoDurationTarget(target) {
    this.videoDurationTarget = target; // 'auto' or seconds integer e.g. 150
  }

  clearFrameBuffer() {
    while (this.frameBuffer.length > 0) {
      const item = this.frameBuffer.shift();
      if (item && item.bitmap && typeof item.bitmap.close === 'function') {
        item.bitmap.close();
      }
    }
  }

  async pushFrame(sourceCanvasOrVideo) {
    if (!this.isMonitoring || !sourceCanvasOrVideo) return;

    try {
      const bitmap = await createImageBitmap(sourceCanvasOrVideo);

      if (this.isRecordingActivity && this.recCtx) {
        this.recCtx.drawImage(bitmap, 0, 0, this.recCanvas.width, this.recCanvas.height);
        bitmap.close();
      } else {
        this.frameBuffer.push({ bitmap, timestamp: Date.now() });

        if (this.frameBuffer.length > this.MAX_PRE_ROLL_FRAMES) {
          const oldest = this.frameBuffer.shift();
          if (oldest && oldest.bitmap && typeof oldest.bitmap.close === 'function') {
            oldest.bitmap.close();
          }
        }
      }
    } catch (err) {
      // Safe catch
    }
  }

  async onHumanDetected(videoOrCanvasElement, metadata = {}) {
    if (!this.isMonitoring) return;

    if (this.tailTimer) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }

    if (!this.isRecordingActivity) {
      this.isRecordingActivity = true;
      this.activityStartTime = Date.now();
      this.activityMetadata = metadata;

      const width = videoOrCanvasElement.videoWidth || videoOrCanvasElement.width || 1280;
      const height = videoOrCanvasElement.videoHeight || videoOrCanvasElement.height || 720;

      this.recCanvas = document.createElement('canvas');
      this.recCanvas.width = width;
      this.recCanvas.height = height;
      this.recCtx = this.recCanvas.getContext('2d');

      const preRollBitmaps = [...this.frameBuffer];
      this.frameBuffer = [];

      for (const item of preRollBitmaps) {
        if (item && item.bitmap) {
          this.recCtx.drawImage(item.bitmap, 0, 0, width, height);
          if (typeof item.bitmap.close === 'function') item.bitmap.close();
        }
      }

      this.recStream = this.recCanvas.captureStream(15);
      this.recordedChunks = [];

      try {
        const selected = this.getBestMimeType();
        this.mimeType = selected.mime;
        this.fileExtension = selected.ext;

        this.mediaRecorder = new MediaRecorder(this.recStream, { mimeType: this.mimeType });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.handleRecordingStopped();
        };

        this.mediaRecorder.start(200);

        if (typeof this.videoDurationTarget === 'number' && this.videoDurationTarget > 0) {
          if (this.fixedDurationTimer) clearTimeout(this.fixedDurationTimer);
          this.fixedDurationTimer = setTimeout(() => {
            this.finishActivityRecording();
          }, this.videoDurationTarget * 1000);
        }

        if (this.onActivityStart) {
          this.onActivityStart({
            timestamp: this.activityStartTime,
            hasPreRoll: true,
            preRollSeconds: 3,
            targetDuration: this.videoDurationTarget,
            mimeType: this.mimeType,
            fileExtension: this.fileExtension,
            ...metadata
          });
        }
      } catch (err) {
        console.error('Error starting MediaRecorder:', err);
        this.isRecordingActivity = false;
        if (this.onError) this.onError(err);
      }
    }
  }

  onHumanLeft() {
    if (!this.isMonitoring || !this.isRecordingActivity) return;

    if (typeof this.videoDurationTarget === 'number' && this.videoDurationTarget > 0) {
      return;
    }

    if (this.tailTimer) return;

    this.tailTimer = setTimeout(() => {
      this.finishActivityRecording();
    }, this.TAIL_DURATION_MS);
  }

  finishActivityRecording() {
    if (!this.isRecordingActivity) return;

    if (this.tailTimer) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }
    if (this.fixedDurationTimer) {
      clearTimeout(this.fixedDurationTimer);
      this.fixedDurationTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.handleRecordingStopped();
      }
    } else {
      this.handleRecordingStopped();
    }
  }

  handleRecordingStopped() {
    if (!this.isRecordingActivity) return;
    this.isRecordingActivity = false;

    const endTime = Date.now();
    const durationSeconds = Math.max(1.0, (endTime - (this.activityStartTime || endTime)) / 1000);

    const videoBlob = new Blob(this.recordedChunks, { type: this.mimeType });
    const metaCopy = { ...this.activityMetadata };

    if (this.recStream) {
      this.recStream.getTracks().forEach(track => track.stop());
      this.recStream = null;
    }

    this.recCanvas = null;
    this.recCtx = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];

    if (this.onActivityComplete && videoBlob.size > 0) {
      this.onActivityComplete({
        blob: videoBlob,
        duration: durationSeconds,
        timestamp: new Date(this.activityStartTime || Date.now()),
        mimeType: this.mimeType,
        fileExtension: this.fileExtension,
        sizeBytes: videoBlob.size,
        ...metaCopy
      });
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.tailTimer) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }
    if (this.fixedDurationTimer) {
      clearTimeout(this.fixedDurationTimer);
      this.fixedDurationTimer = null;
    }

    if (this.isRecordingActivity) {
      this.finishActivityRecording();
    }

    this.clearFrameBuffer();

    if (this.recStream) {
      this.recStream.getTracks().forEach(track => track.stop());
      this.recStream = null;
    }

    this.recCanvas = null;
    this.recCtx = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

export const recorderService = new RecorderService();
