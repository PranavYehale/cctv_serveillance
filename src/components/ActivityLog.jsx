import React from 'react';
import { History, Trash2, Download, AlertCircle, Camera, Video, Info } from 'lucide-react';

export default function ActivityLog({ logs, onClearLogs, onExportLogs }) {
  const getLogIcon = (type) => {
    switch (type) {
      case 'detection':
        return <Camera className="w-4 h-4 text-emerald-400" />;
      case 'recording_stop':
        return <Video className="w-4 h-4 text-cyan-400" />;
      case 'recording_start':
        return <Video className="w-4 h-4 text-amber-400 animate-pulse" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'detection':
        return 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400';
      case 'recording_stop':
        return 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400';
      case 'recording_start':
        return 'bg-amber-950/80 border-amber-500/40 text-amber-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="bg-surveillance-panel border border-surveillance-border rounded-xl p-5 text-slate-200 shadow-xl flex flex-col h-[400px]">
      {/* Log Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surveillance-border mb-3">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">Activity Timeline</h2>
          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onExportLogs}
            disabled={logs.length === 0}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded transition disabled:opacity-40"
            title="Export Activity Log"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1.5 bg-slate-800 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-400 rounded transition disabled:opacity-40"
            title="Clear Activity Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center font-mono space-y-2">
            <AlertCircle className="w-8 h-8 opacity-40" />
            <p className="text-xs">No activity logged yet.</p>
            <p className="text-[11px] text-slate-600">Events will appear here when a human is detected.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id || log.timestamp}
              className="p-2.5 rounded bg-slate-900/90 border border-slate-800/80 flex items-start space-x-3 text-xs font-mono transition hover:border-slate-700"
            >
              {/* Event Time */}
              <span className="text-slate-400 font-bold tracking-tight whitespace-nowrap pt-0.5">
                {log.displayTime}
              </span>

              <span className="text-slate-600">→</span>

              {/* Event Type Badge */}
              <div className={`p-1 rounded border flex-shrink-0 ${getBadgeStyle(log.type)}`}>
                {getLogIcon(log.type)}
              </div>

              {/* Event Message */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium leading-relaxed">
                  {log.message}
                </p>
                {log.meta && (
                  <div className="text-[11px] text-slate-400 mt-0.5 space-x-2">
                    {log.meta.confidence && <span>Conf: {log.meta.confidence}%</span>}
                    {log.meta.duration && <span>Duration: {log.meta.duration}s</span>}
                    {log.meta.filename && <span className="text-slate-500">{log.meta.filename}</span>}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
