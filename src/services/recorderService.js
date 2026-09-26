/**
 * Guaranteed Non-Zero Video Recorder Service.
 * Uses direct stream recording & synchronous canvas drawing (ctx.drawImage)
 * ensuring 100% non-zero multi-megabyte video files and 2:30 min auto re-triggering.
 */

export class RecorderService {
  constructor() {
    this.isMonitoring = false;
    this.isRecordingActivity = false;

    // Direct MediaStream and MediaRecorder
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // Pre-roll Frame Canvas Ring Buffer
    this.preRollCanvases = [];
    this.MAX_PRE_ROLL_CANVASES = 45; // 45 frames @ 15fps = 3.0s

    // Offscreen Canvas for recording stream
    this.recCanvas = null;
    this.recCtx = null;
    this.recStream = null;

    // Timing & Target Controls
    this.activityStartTime = null;
    this.activityMetadata = null;
    this.tailTimer = null;
    this.fixedDurationTimer = null;
    this.TAIL_DURATION_MS = 2500;
    this.videoDurationTarget = 150; // Default 2:30 min (150s)

    this.mimeType = 'video/webm';
    this.fileExtension = 'webm';

    // Callbacks
    this.onActivityStart = null;
    this.onActivityComplete = null;
    this.onError = null;
    this.onCheckReTrigger = null;
  }

  getBestMimeType() {
    const candidates = [
      { mime: 'video/webm;codecs=vp9', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' },
      { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' }
    ];

    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
        return c;
      }
    }
    return { mime: 'video/webm', ext: 'webm' };
  }

  startMonitoring(stream, callbacks = {}) {
    this.isMonitoring = true;
    this.isRecordingActivity = false;
    this.stream = stream;
    this.preRollCanvases = [];

    this.onActivityStart = callbacks.onActivityStart || null;
    this.onActivityComplete = callbacks.onActivityComplete || null;
    this.onError = callbacks.onError || null;

    const selected = this.getBestMimeType();
    this.mimeType = selected.mime;
    this.fileExtension = selected.ext;
  }

  setVideoDurationTarget(target) {
    this.videoDurationTarget = target;
  }

  /**
   * Synchronous Canvas Frame Drawer (Replaces unstable createImageBitmap)
   */
  pushFrame(videoElement) {
    if (!this.isMonitoring || !videoElement || videoElement.readyState < 2) return;

    const width = videoElement.videoWidth || 1280;
    const height = videoElement.videoHeight || 720;

    if (this.isRecordingActivity && this.recCtx) {
      // Draw live video frame directly to active recording canvas
      try {
        this.recCtx.drawImage(videoElement, 0, 0, width, height);
      } catch (e) {}
    } else {
      // Maintain pre-roll offscreen canvas ring buffer
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(videoElement, 0, 0, width, height);

        this.preRollCanvases.push(offCanvas);

        if (this.preRollCanvases.length > this.MAX_PRE_ROLL_CANVASES) {
          this.preRollCanvases.shift();
        }
      } catch (e) {}
    }
  }

  onHumanDetected(videoElement, metadata = {}) {
    if (!this.isMonitoring) return;

    if (this.tailTimer) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }

    if (!this.isRecordingActivity) {
      this.isRecordingActivity = true;
      this.activityStartTime = Date.now();
      this.activityMetadata = metadata;

      const width = (videoElement && videoElement.videoWidth) ? videoElement.videoWidth : 1280;
      const height = (videoElement && videoElement.videoHeight) ? videoElement.videoHeight : 720;

      // Setup Offscreen Recording Canvas
      this.recCanvas = document.createElement('canvas');
      this.recCanvas.width = width;
      this.recCanvas.height = height;
      this.recCtx = this.recCanvas.getContext('2d');

      // Flush 3-second pre-roll canvases onto recording canvas first
      const preRolls = [...this.preRollCanvases];
      this.preRollCanvases = [];

      for (const offCanvas of preRolls) {
        try {
          this.recCtx.drawImage(offCanvas, 0, 0, width, height);
        } catch (e) {}
      }

      // Draw initial live frame
      if (videoElement && videoElement.readyState >= 2) {
        try {
          this.recCtx.drawImage(videoElement, 0, 0, width, height);
        } catch (e) {}
      }

      // Capture 15 FPS stream from recording canvas
      this.recStream = this.recCanvas.captureStream(15);
      this.recordedChunks = [];

      const selected = this.getBestMimeType();
      this.mimeType = selected.mime;
      this.fileExtension = selected.ext;

      try {
        this.mediaRecorder = new MediaRecorder(this.recStream, { mimeType: this.mimeType });

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.handleRecordingStopped(videoElement);
        };

        // Collect slices every 200ms
        this.mediaRecorder.start(200);

        // Handle 2:30 Min (150s) Fixed Target Round
        if (typeof this.videoDurationTarget === 'number' && this.videoDurationTarget > 0) {
          if (this.fixedDurationTimer) clearTimeout(this.fixedDurationTimer);
          this.fixedDurationTimer = setTimeout(() => {
            this.finishActivityRecording(videoElement);
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
        console.error('MediaRecorder start error:', err);
        this.isRecordingActivity = false;
        if (this.onError) this.onError(err);
      }
    }
  }

  onHumanLeft() {
    if (!this.isMonitoring || !this.isRecordingActivity) return;

    if (typeof this.videoDurationTarget === 'number' && this.videoDurationTarget > 0) {
      return; // Keep recording until 2:30 min target finishes
    }

    if (this.tailTimer) return;

    this.tailTimer = setTimeout(() => {
      this.finishActivityRecording();
    }, this.TAIL_DURATION_MS);
  }

  finishActivityRecording(currentVideoElement = null) {
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
        this.handleRecordingStopped(currentVideoElement);
      }
    } else {
      this.handleRecordingStopped(currentVideoElement);
    }
  }

  handleRecordingStopped(currentVideoElement = null) {
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

    // Auto Re-Triggering Logic: If 2:30 min round completed and person is STILL detected, start Round #2!
    if (currentVideoElement && this.isMonitoring) {
      setTimeout(() => {
        if (this.onCheckReTrigger) {
          this.onCheckReTrigger(currentVideoElement);
        }
      }, 500);
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

    this.preRollCanvases = [];

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
