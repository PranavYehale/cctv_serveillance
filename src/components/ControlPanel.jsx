import React from 'react';
import { Play, Square, RefreshCw, Sliders, ShieldCheck, Download, Camera, Video, Monitor, Cloud, Clock } from 'lucide-react';

export default function ControlPanel({
  isMonitoring,
  onToggleMonitoring,
  confidenceThreshold,
  onChangeConfidence,
  cooldownPeriod,
  onChangeCooldown,
  resolution,
  onChangeResolution,
  facingMode,
  onChangeFacingMode,
  burstPhotoCount,
  onChangeBurstCount,
  videoDurationTarget,
  onChangeVideoDurationTarget,
  autoDownload,
  onToggleAutoDownload,
  isDriveSyncEnabled,
  onOpenDriveModal,
  onManualSnapshot
}) {
  return (
    <div className="bg-surveillance-panel border border-surveillance-border rounded-xl p-5 text-slate-200 shadow-xl space-y-6">
      {/* Primary Action Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surveillance-border">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" /> Control & Sensitivity Settings
          </h2>
          <p className="text-xs text-slate-400 font-mono">Configure AI detector, video duration & cloud sync</p>
        </div>

        {/* Start / Stop Monitoring Master Switch */}
        <button
          onClick={onToggleMonitoring}
          className={`px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition shadow-lg flex items-center space-x-2 ${
            isMonitoring
              ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-500/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/50'
          }`}
        >
          {isMonitoring ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Monitoring</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Start Monitoring</span>
            </>
          )}
        </button>
      </div>

      {/* Grid of Settings Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        
        {/* Detection Sensitivity (Confidence Threshold) Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Person Confidence Threshold
            </label>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.30"
            max="0.90"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => onChangeConfidence(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>30% (High Detection)</span>
            <span>60% (Recommended)</span>
            <span>90% (Strict)</span>
          </div>
        </div>

        {/* Cooldown Period Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-amber-400" /> Duplicate Cooldown Period
            </label>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 font-bold">
              {cooldownPeriod}s
            </span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={cooldownPeriod}
            onChange={(e) => onChangeCooldown(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>3 sec (Frequent)</span>
            <span>10 sec (Default)</span>
            <span>30 sec (Suppressed)</span>
          </div>
        </div>

        {/* Photo Burst Quantity & Unlimited Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-emerald-400" /> Photo Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
            <button
              onClick={() => onChangeBurstCount(3)}
              className={`py-2 rounded border transition ${
                burstPhotoCount === 3
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              3 Photos
            </button>
            <button
              onClick={() => onChangeBurstCount(4)}
              className={`py-2 rounded border transition ${
                burstPhotoCount === 4
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              4 Photos
            </button>
            <button
              onClick={() => onChangeBurstCount('unlimited')}
              className={`py-2 rounded border transition ${
                burstPhotoCount === 'unlimited'
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold ring-1 ring-emerald-400/50'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              ∞ Unlimited
            </button>
          </div>
        </div>

        {/* Video Duration Mode (Auto vs 2:30 Min Fixed) */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
            <Video className="w-4 h-4 text-cyan-400" /> Video Duration Target
          </label>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <button
              onClick={() => onChangeVideoDurationTarget('auto')}
              className={`py-2 px-2 rounded border transition ${
                videoDurationTarget === 'auto'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-400 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Auto (Person Leaves)
            </button>
            <button
              onClick={() => onChangeVideoDurationTarget(150)}
              className={`py-2 px-2 rounded border transition ${
                videoDurationTarget === 150
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold ring-1 ring-cyan-400/50'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              2:30 Min (150s Fixed)
            </button>
          </div>
        </div>

        {/* Camera Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-purple-400" /> Camera Source
          </label>
          <select
            value={facingMode}
            onChange={(e) => onChangeFacingMode(e.target.value)}
            disabled={isMonitoring}
            className="w-full bg-slate-900 border border-surveillance-border rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50"
          >
            <option value="user">Front Camera (Selfie / Laptop)</option>
            <option value="environment">Rear Camera (Mobile Surveillance)</option>
          </select>
        </div>

        {/* Camera Resolution */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-amber-400" /> Stream Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) => onChangeResolution(e.target.value)}
            disabled={isMonitoring}
            className="w-full bg-slate-900 border border-surveillance-border rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50"
          >
            <option value="720p">720p HD (1280 x 720) - Fast AI</option>
            <option value="1080p">1080p Full HD (1920 x 1080) - Sharp</option>
            <option value="480p">480p SD (640 x 480) - Low Power</option>
          </select>
        </div>

        {/* Google Drive & Local Storage Controls */}
        <div className="space-y-2 md:col-span-2 pt-2 border-t border-surveillance-border grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Google Drive Setup Launcher */}
          <button
            onClick={onOpenDriveModal}
            className={`p-2.5 rounded border font-mono text-xs flex items-center justify-between transition ${
              isDriveSyncEnabled
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span className="font-bold">Google Drive Sync</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-bold uppercase">
              {isDriveSyncEnabled ? 'ACTIVE' : 'SETUP'}
            </span>
          </button>

          {/* Local Auto-Download */}
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-slate-200 font-semibold">Auto-Download Files</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoDownload}
                onChange={(e) => onToggleAutoDownload(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Manual Snapshot */}
          <button
            onClick={onManualSnapshot}
            disabled={!isMonitoring}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono rounded font-semibold transition disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manual Photo Burst Test</span>
          </button>
        </div>

      </div>
    </div>
  );
}
