import React from 'react';
import { Camera, Shield, Cpu, HardDrive, CircleDot, Cloud } from 'lucide-react';

export default function Header({ 
  isMonitoring, 
  isModelLoaded, 
  isRecording, 
  peopleCount, 
  storageStats,
  isDriveSyncEnabled,
  onOpenDriveModal
}) {
  return (
    <header className="bg-surveillance-panel border-b border-surveillance-border px-4 py-3 text-white flex flex-wrap items-center justify-between gap-4">
      {/* Brand Title */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-emerald-950 border border-emerald-500/40 rounded-lg text-emerald-400">
          <Shield className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase text-slate-100 flex items-center gap-2">
            Smart Camera Surveillance <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono">v1.1 AI</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Browser AI Human Detection • 3s Pre-Roll • Google Drive Sync • Unlimited Photo Mode
          </p>
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center space-x-3 text-xs font-mono">
        {/* Google Drive Status Button */}
        <button
          onClick={onOpenDriveModal}
          className={`px-3 py-1.5 rounded-full border flex items-center space-x-1.5 transition ${
            isDriveSyncEnabled
              ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/90'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Google Drive Cloud Sync Setup"
        >
          <Cloud className={`w-3.5 h-3.5 ${isDriveSyncEnabled ? 'text-cyan-400 animate-pulse' : ''}`} />
          <span className="font-semibold">{isDriveSyncEnabled ? 'GDrive Sync ON' : 'GDrive Setup'}</span>
        </button>

        {/* Monitoring Status Badge */}
        <div className={`px-3 py-1.5 rounded-full border flex items-center space-x-2 ${
          isMonitoring 
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}>
          <CircleDot className={`w-3.5 h-3.5 ${isMonitoring ? 'text-emerald-400 animate-ping' : ''}`} />
          <span className="font-semibold">{isMonitoring ? 'MONITORING ACTIVE' : 'SYSTEM STANDBY'}</span>
        </div>

        {/* Recording Badge */}
        {isRecording && (
          <div className="px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 flex items-center space-x-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="font-bold">REC (+3s Pre-roll)</span>
          </div>
        )}

        {/* AI Model Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isModelLoaded ? 'COCO-SSD Ready' : 'Loading Model...'}</span>
        </div>

        {/* Storage Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>{storageStats ? `${storageStats.totalMB} MB Used` : '0 MB'}</span>
        </div>
      </div>
    </header>
  );
}
