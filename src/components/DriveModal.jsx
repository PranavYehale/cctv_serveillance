import React, { useState } from 'react';
import { Cloud, Check, Copy, ExternalLink, Send, ShieldAlert, X, HelpCircle } from 'lucide-react';
import { driveService } from '../services/driveService';

export default function DriveModal({ isOpen, onClose, onSave }) {
  const [webhookUrl, setWebhookUrl] = useState(driveService.webhookUrl);
  const [isEnabled, setIsEnabled] = useState(driveService.isEnabled);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(driveService.getAppsScriptCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestUpload = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      driveService.setWebhookUrl(webhookUrl);
      const res = await driveService.testUpload();
      if (res.success) {
        setTestResult({ success: true, message: `Upload verified! Saved to Google Drive.` });
      } else {
        setTestResult({ success: false, message: res.error || 'Upload failed. Please check Webhook URL permissions.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    }
    setIsTesting(false);
  };

  const handleSaveAndClose = () => {
    driveService.setWebhookUrl(webhookUrl);
    driveService.setEnabled(isEnabled);
    if (onSave) onSave({ isEnabled, webhookUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full bg-slate-950 border border-surveillance-border rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2 font-mono">
            <Cloud className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
              Google Drive Cloud Sync Setup
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:text-red-400 transition text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar text-xs font-mono text-slate-300">
          
          {/* Target Folder Banner */}
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-cyan-300 font-bold uppercase">Target Google Drive Folder</p>
              <p className="text-[11px] text-slate-400 truncate">ID: 1XOOsBa34u3CQxWH4t8C8xCADWrOIfUYo</p>
            </div>
            <a
              href="https://drive.google.com/drive/folders/1XOOsBa34u3CQxWH4t8C8xCADWrOIfUYo?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition flex items-center space-x-1"
            >
              <span>Open Folder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Master Enable Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
            <div>
              <p className="font-bold text-slate-200 uppercase">Enable Auto Cloud Sync</p>
              <p className="text-[11px] text-slate-400">Automatically upload captured photos & videos to Google Drive</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-2">
            <label className="font-bold text-slate-200 uppercase flex items-center gap-1.5">
              <span>Google Apps Script Webhook URL</span>
            </label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Test & Copy Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleTestUpload}
              disabled={isTesting || !webhookUrl}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition disabled:opacity-40 flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Testing Upload...' : 'Test Google Drive Upload'}</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold transition flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Code Copied!' : 'Copy Google Apps Script Code'}</span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-3 rounded border ${
              testResult.success 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}>
              {testResult.message}
            </div>
          )}

          {/* 3-Step Setup Instructions */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-slate-400 text-[11px]">
            <p className="font-bold text-slate-200 flex items-center gap-1 uppercase">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> 1-Minute Setup Guide (Free)
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Click <strong>Copy Google Apps Script Code</strong> above.</li>
              <li>Open <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">script.google.com</a> and click <strong>New Project</strong>.</li>
              <li>Paste the code, click <strong>Deploy → New deployment</strong>, select type <strong>Web App</strong>.</li>
              <li>Set <i>Execute as</i>: <strong>Me</strong> and <i>Who has access</i>: <strong>Anyone</strong>.</li>
              <li>Copy the generated Web App URL and paste it into the input box above!</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end space-x-2 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded transition"
          >
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
}
