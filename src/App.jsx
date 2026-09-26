import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import CameraFeed from './components/CameraFeed';
import ControlPanel from './components/ControlPanel';
import ActivityLog from './components/ActivityLog';
import Gallery from './components/Gallery';
import { detectorService } from './services/detectorService';
import { recorderService } from './services/recorderService';
import { storageService } from './services/storageService';

export default function App() {
  // --- States ---
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');

  // Surveillance Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.60);
  const [cooldownPeriod, setCooldownPeriod] = useState(10); // 10s
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [resolution, setResolution] = useState('720p'); // '720p' | '1080p'
  const [burstPhotoCount, setBurstPhotoCount] = useState(4); // 3 or 4 photos
  const [autoDownload, setAutoDownload] = useState(true);

  // Runtime Stats
  const [peopleCount, setPeopleCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [storageStats, setStorageStats] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const cooldownTimerRef = useRef(null);
  const isProcessingBurstRef = useRef(false);

  // Load IndexedDB items on mount & load AI Model
  useEffect(() => {
    async function init() {
      try {
        await storageService.initDB();
        await refreshGalleryAndLogs();
        await detectorService.loadModel();
        setIsModelLoaded(true);
        await storageService.addLog({
          type: 'system',
          message: 'System initialized. COCO-SSD AI detector ready.'
        });
        await refreshGalleryAndLogs();
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();

    return () => {
      stopCameraAndMonitoring();
    };
  }, []);

  const refreshGalleryAndLogs = async () => {
    try {
      const allPhotos = await storageService.getAllPhotos();
      const allVideos = await storageService.getAllVideos();
      const allLogs = await storageService.getAllLogs();
      const stats = await storageService.getStorageStats();

      setPhotos(allPhotos);
      setVideos(allVideos);
      setLogs(allLogs);
      setStorageStats(stats);
    } catch (e) {
      console.error('Error refreshing storage data:', e);
    }
  };

  // --- Camera Access ---
  const requestCameraPermission = async () => {
    setHasCameraError(false);
    setCameraErrorMessage('');

    const width = resolution === '1080p' ? 1920 : 1280;
    const height = resolution === '1080p' ? 1080 : 720;

    const constraints = {
      video: {
        facingMode,
        width: { ideal: width },
        height: { ideal: height }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setPermissionGranted(true);
      setIsMonitoring(true);

      // Initialize Video Recorder with 3s Pre-roll Ring Buffer
      recorderService.startMonitoring({
        onActivityStart: (info) => {
          setIsRecording(true);
          storageService.addLog({
            type: 'recording_start',
            message: `Started activity recording (with 3s pre-roll buffer)`,
            meta: info
          }).then(refreshGalleryAndLogs);
        },
        onActivityComplete: async (result) => {
          setIsRecording(false);
          const savedVid = await storageService.saveVideo({
            blob: result.blob,
            duration: result.duration,
            confidence: result.confidence || 0.8,
            peopleCount: result.peopleCount || 1,
            timestamp: result.timestamp,
            fileExtension: result.fileExtension
          });

          await storageService.addLog({
            type: 'recording_stop',
            message: `Activity recording completed → ${result.duration.toFixed(1)} sec video saved (${(result.blob.size / (1024 * 1024)).toFixed(1)} MB)`,
            meta: { filename: savedVid.filename, duration: result.duration.toFixed(1) }
          });

          if (autoDownload) {
            storageService.downloadBlob(result.blob, savedVid.filename);
          }

          refreshGalleryAndLogs();
        }
      });

      startDetectionLoop();
    } catch (err) {
      console.error('Camera permission failed:', err);
      setHasCameraError(true);
      setCameraErrorMessage(err.message || 'Permission denied or camera device unavailable.');
      setPermissionGranted(false);
      setIsMonitoring(false);
    }
  };

  const stopCameraAndMonitoring = () => {
    setIsMonitoring(false);
    setIsRecording(false);
    setPeopleCount(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    recorderService.stopMonitoring();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      stopCameraAndMonitoring();
      storageService.addLog({
        type: 'system',
        message: 'Surveillance monitoring stopped by user.'
      }).then(refreshGalleryAndLogs);
    } else {
      requestCameraPermission();
    }
  };

  // --- Detection & Surveillance Loop ---
  const startDetectionLoop = () => {
    let lastFrameTime = 0;
    const targetFpsMs = 1000 / 15; // 15 FPS detection rate for smooth performance

    const loop = async (timestamp) => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (timestamp - lastFrameTime >= targetFpsMs) {
        lastFrameTime = timestamp;

        try {
          // Push current frame into 3-second pre-roll frame buffer & active recorder
          recorderService.pushFrame(videoRef.current);

          const result = await detectorService.detect(videoRef.current, confidenceThreshold);
          setPeopleCount(result.count);

          // Draw Bounding Boxes and HUD Canvas Overlay
          detectorService.drawOverlay(
            canvasRef.current,
            videoRef.current,
            result.people,
            confidenceThreshold,
            recorderService.isRecordingActivity
          );

          if (result.hasHuman) {
            // Signal recorder service that a human is in frame
            const maxConfidence = Math.max(...result.people.map(p => p.score));
            recorderService.onHumanDetected(videoRef.current, {
              confidence: maxConfidence,
              peopleCount: result.count
            });

            // Trigger Photo Burst if NOT in cooldown
            const now = Date.now();
            if (
              !isProcessingBurstRef.current &&
              (now - lastDetectionTimeRef.current > cooldownPeriod * 1000)
            ) {
              lastDetectionTimeRef.current = now;
              triggerPhotoBurstSequence(maxConfidence, result.count);
            }
          } else {
            // Signal recorder service that human left scene (will trigger 2.5s tail wrap-up)
            recorderService.onHumanLeft();
          }
        } catch (e) {
          console.error('Detection frame processing error:', e);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  // --- Photo Burst Capture Handler ---
  const triggerPhotoBurstSequence = async (confidence, count) => {
    isProcessingBurstRef.current = true;

    // Start UI Cooldown Countdown
    startCooldownTimer(cooldownPeriod);

    // Capture 3-4 consecutive photos spaced ~350ms apart
    const photosCaptured = await detectorService.capturePhotoBurst(
      videoRef.current,
      burstPhotoCount,
      350,
      confidence,
      count
    );

    // Save all captured photos to IndexedDB
    for (const p of photosCaptured) {
      const savedPhoto = await storageService.savePhoto({
        blob: p.blob,
        dataUrl: p.dataUrl,
        confidence: p.confidence,
        peopleCount: p.peopleCount,
        index: p.index,
        timestamp: p.timestamp
      });

      if (autoDownload) {
        storageService.downloadDataUrl(p.dataUrl, savedPhoto.filename);
      }
    }

    await storageService.addLog({
      type: 'detection',
      message: `Person detected (${count} in frame) → Captured ${photosCaptured.length} photos`,
      meta: { confidence: Math.round(confidence * 100), count: photosCaptured.length }
    });

    await refreshGalleryAndLogs();
    isProcessingBurstRef.current = false;
  };

  const startCooldownTimer = (seconds) => {
    setCooldownRemaining(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Manual Photo Burst Test
  const handleManualSnapshot = async () => {
    if (!videoRef.current) return;
    triggerPhotoBurstSequence(0.95, 1);
  };

  // Gallery Operations
  const handleDeletePhoto = async (id) => {
    await storageService.deletePhoto(id);
    refreshGalleryAndLogs();
  };

  const handleDeleteVideo = async (id) => {
    await storageService.deleteVideo(id);
    refreshGalleryAndLogs();
  };

  const handleDownloadPhoto = (photo) => {
    if (photo.dataUrl) {
      storageService.downloadDataUrl(photo.dataUrl, photo.filename);
    } else if (photo.blob) {
      storageService.downloadBlob(photo.blob, photo.filename);
    }
  };

  const handleDownloadVideo = (video) => {
    if (video.blob) {
      storageService.downloadBlob(video.blob, video.filename);
    }
  };

  const handleDownloadAll = async () => {
    for (const p of photos) {
      handleDownloadPhoto(p);
      await new Promise(r => setTimeout(r, 200));
    }
    for (const v of videos) {
      handleDownloadVideo(v);
      await new Promise(r => setTimeout(r, 200));
    }
  };

  const handleClearLogs = async () => {
    await storageService.clearLogs();
    refreshGalleryAndLogs();
  };

  const handleExportLogs = () => {
    const logText = logs.map(l => `[${l.displayTime}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    storageService.downloadBlob(blob, `surveillance_logs_${Date.now()}.txt`);
  };

  return (
    <div className="min-h-screen bg-surveillance-dark text-slate-100 font-sans flex flex-col">
      {/* Header Bar */}
      <Header
        isMonitoring={isMonitoring}
        isModelLoaded={isModelLoaded}
        isRecording={isRecording}
        peopleCount={peopleCount}
        storageStats={storageStats}
      />

      {/* Main Command Center Layout */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Grid: Camera Stream & Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Camera Video Stream Feed (7 cols on lg) */}
          <div className="lg:col-span-7">
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              isMonitoring={isMonitoring}
              permissionGranted={permissionGranted}
              hasCameraError={hasCameraError}
              cameraErrorMessage={cameraErrorMessage}
              requestCameraPermission={requestCameraPermission}
              peopleCount={peopleCount}
              cooldownRemaining={cooldownRemaining}
              resolution={resolution}
              facingMode={facingMode}
              isRecording={isRecording}
            />
          </div>

          {/* Control & Sensitivity Settings (5 cols on lg) */}
          <div className="lg:col-span-5">
            <ControlPanel
              isMonitoring={isMonitoring}
              onToggleMonitoring={handleToggleMonitoring}
              confidenceThreshold={confidenceThreshold}
              onChangeConfidence={setConfidenceThreshold}
              cooldownPeriod={cooldownPeriod}
              onChangeCooldown={setCooldownPeriod}
              resolution={resolution}
              onChangeResolution={(r) => { setResolution(r); stopCameraAndMonitoring(); }}
              facingMode={facingMode}
              onChangeFacingMode={(f) => { setFacingMode(f); stopCameraAndMonitoring(); }}
              burstPhotoCount={burstPhotoCount}
              onChangeBurstCount={setBurstPhotoCount}
              autoDownload={autoDownload}
              onToggleAutoDownload={setAutoDownload}
              onManualSnapshot={handleManualSnapshot}
            />
          </div>
        </div>

        {/* Middle Grid: Activity Timeline Log */}
        <div>
          <ActivityLog
            logs={logs}
            onClearLogs={handleClearLogs}
            onExportLogs={handleExportLogs}
          />
        </div>

        {/* Bottom Section: Media Gallery */}
        <div>
          <Gallery
            photos={photos}
            videos={videos}
            onDeletePhoto={handleDeletePhoto}
            onDeleteVideo={handleDeleteVideo}
            onDownloadPhoto={handleDownloadPhoto}
            onDownloadVideo={handleDownloadVideo}
            onDownloadAll={handleDownloadAll}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-surveillance-border bg-surveillance-panel py-3 px-4 text-center text-xs text-slate-500 font-mono">
        Smart Camera Surveillance Web App • Powered by TensorFlow.js, HTML5 MediaRecorder & IndexedDB
      </footer>
    </div>
  );
}
