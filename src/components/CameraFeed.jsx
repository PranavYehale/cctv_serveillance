import React from 'react';
import { Camera, AlertTriangle, Eye, VideoOff, CheckCircle2, Clock } from 'lucide-react';

export default function CameraFeed({
  videoRef,
  canvasRef,
  isMonitoring,
  permissionGranted,
  hasCameraError,
  cameraErrorMessage,
  requestCameraPermission,
  peopleCount,
  cooldownRemaining,
  resolution,
  facingMode,
  isRecording
}) {
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl border border-surveillance-border overflow-hidden shadow-2xl flex items-center justify-center">
      {/* Live Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full h-full object-contain transform scale-x-100"
      />

      {/* Canvas Overlay for AI Bounding Boxes & HUD */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none object-contain"
      />

      {/* Top Floating Status Overlay */}
      {isMonitoring && permissionGranted && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs font-mono">
          {/* Left Stats */}
          <div className="flex items-center space-x-2">
            <div className={`px-2.5 py-1 rounded bg-black/75 border ${
              peopleCount > 0 
                ? 'border-emerald-500 text-emerald-400 font-bold bg-emerald-950/80 animate-pulse' 
                : 'border-slate-700 text-slate-300'
            } flex items-center space-x-1.5 backdrop-blur-md`}>
              <Eye className="w-3.5 h-3.5" />
              <span>DETECTED: {peopleCount} {peopleCount === 1 ? 'PERSON' : 'PEOPLE'}</span>
            </div>

            {cooldownRemaining > 0 && (
              <div className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 flex items-center space-x-1 backdrop-blur-md">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>COOLDOWN: {cooldownRemaining}s</span>
              </div>
            )}
          </div>

          {/* Right Specs */}
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 rounded bg-black/60 border border-slate-700 text-slate-300 uppercase backdrop-blur-md">
              {resolution}
            </span>
            <span className="px-2 py-1 rounded bg-black/60 border border-slate-700 text-slate-300 uppercase backdrop-blur-md">
              {facingMode === 'user' ? 'Front Cam' : 'Rear Cam'}
            </span>
          </div>
        </div>
      )}

      {/* Standby / Permission Required Screen */}
      {(!isMonitoring || !permissionGranted) && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
          {hasCameraError ? (
            <div className="max-w-md space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <VideoOff className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-red-400">Camera Access Error</h3>
              <p className="text-sm text-slate-400 font-mono">{cameraErrorMessage || 'Unable to access camera device. Please grant permission in browser settings.'}</p>
              <button
                onClick={requestCameraPermission}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition shadow-lg flex items-center justify-center space-x-2 mx-auto"
              >
                <Camera className="w-4 h-4" />
                <span>Retry Camera Permission</span>
              </button>
            </div>
          ) : (
            <div className="max-w-md space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Smart Camera System Ready</h3>
              <p className="text-sm text-slate-400">
                Grant camera permission to begin AI human detection, 4-photo burst capture, and 3-second pre-roll video recording.
              </p>
              <button
                onClick={requestCameraPermission}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm tracking-wide uppercase transition shadow-lg flex items-center justify-center space-x-2 mx-auto"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Start Camera & Monitoring</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
