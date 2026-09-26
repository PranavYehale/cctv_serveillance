import React, { useState } from 'react';
import { Image, Film, Download, Trash2, Maximize2, Play, Calendar, Clock, Eye, AlertCircle, X } from 'lucide-react';

export default function Gallery({
  photos = [],
  videos = [],
  onDeletePhoto,
  onDeleteVideo,
  onDownloadPhoto,
  onDownloadVideo,
  onDownloadAll
}) {
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'videos'
  const [selectedItem, setSelectedItem] = useState(null); // Lightbox item

  return (
    <div className="bg-surveillance-panel border border-surveillance-border rounded-xl p-5 text-slate-200 shadow-xl space-y-4">
      {/* Gallery Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-surveillance-border">
        {/* Tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition flex items-center space-x-2 ${
              activeTab === 'photos'
                ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Captured Photos ({photos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition flex items-center space-x-2 ${
              activeTab === 'videos'
                ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Activity Videos ({videos.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onDownloadAll}
            disabled={(activeTab === 'photos' ? photos.length : videos.length) === 0}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition shadow disabled:opacity-40 flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All ({activeTab === 'photos' ? photos.length : videos.length})</span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {activeTab === 'photos' ? (
        photos.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-center font-mono space-y-2">
            <AlertCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm font-semibold">No photos captured yet.</p>
            <p className="text-xs text-slate-600">Photos will automatically be captured when a person enters frame.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-lg overflow-hidden transition shadow-md flex flex-col"
              >
                {/* Thumbnail Image */}
                <div 
                  onClick={() => setSelectedItem({ type: 'photo', item: photo })}
                  className="aspect-video bg-black overflow-hidden cursor-pointer relative"
                >
                  <img
                    src={photo.dataUrl || (photo.blob ? URL.createObjectURL(photo.blob) : '')}
                    alt={photo.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                    {photo.confidence}% Conf
                  </span>
                </div>

                {/* Info & Download Bar */}
                <div className="p-2 text-[11px] font-mono flex items-center justify-between bg-slate-950 text-slate-400 border-t border-slate-800">
                  <div className="truncate pr-1">
                    <p className="text-slate-200 font-bold truncate">{photo.filename}</p>
                    <p className="text-slate-500 text-[10px]">{photo.displayTime}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onDownloadPhoto(photo)}
                      className="p-1 text-slate-400 hover:text-emerald-400 transition"
                      title="Download Photo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Videos Grid */
        videos.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-center font-mono space-y-2">
            <AlertCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm font-semibold">No activity videos recorded yet.</p>
            <p className="text-xs text-slate-600">Videos include 3s pre-roll buffer prior to person detection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {videos.map((video) => {
              const videoUrl = video.blob ? URL.createObjectURL(video.blob) : '';
              return (
                <div
                  key={video.id}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-lg overflow-hidden transition shadow-md flex flex-col"
                >
                  {/* Video Player */}
                  <div className="aspect-video bg-black relative">
                    <video
                      src={videoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                      3s Pre-roll + {video.duration}s
                    </span>
                  </div>

                  {/* Info Bar */}
                  <div className="p-3 font-mono text-xs flex items-center justify-between bg-slate-950 border-t border-slate-800">
                    <div>
                      <p className="text-slate-200 font-bold truncate">{video.filename}</p>
                      <p className="text-slate-500 text-[10px] flex items-center gap-2">
                        <span>{video.displayTime}</span>
                        <span>•</span>
                        <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onDownloadVideo(video)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded transition"
                        title="Download Recorded Video"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteVideo(video.id)}
                        className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400 rounded transition"
                        title="Delete Video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Lightbox Modal for Photos */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-950 border border-surveillance-border rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800 text-slate-200 font-mono text-sm">
              <span className="font-bold text-emerald-400">{selectedItem.item.filename}</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:text-red-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[80vh]">
              <img
                src={selectedItem.item.dataUrl || (selectedItem.item.blob ? URL.createObjectURL(selectedItem.item.blob) : '')}
                alt={selectedItem.item.filename}
                className="max-h-[75vh] object-contain rounded"
              />
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Captured at {selectedItem.item.displayTime} • Conf: {selectedItem.item.confidence}%</span>
              <button
                onClick={() => onDownloadPhoto(selectedItem.item)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save JPG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
