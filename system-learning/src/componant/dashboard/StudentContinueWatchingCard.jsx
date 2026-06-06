import React from "react";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function ContinueWatchingCard({ lesson, progress, onContinue }) {
  if (!lesson) return null;

  const lastTime = progress?.lastTime || 0;
  const unitName = lesson.section || "بدون وحدة";

  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-xl shadow-slate-300/30 group hover:shadow-2xl hover:shadow-slate-400/40 transition-all duration-300">
      <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="flex-shrink-0 w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black relative shadow-lg">
          {lesson.vimeoId && (
            <iframe
              src={`https://player.vimeo.com/video/${lesson.vimeoId.replace(/\D/g, "")}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
              frameBorder="0"
              allow="autoplay; fullscreen"
              title={lesson.title}
              className="w-full h-full pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-white mr-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
          {lastTime > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-mono">
              {formatTime(lastTime)}
            </div>
          )}
        </div>

        <div className="flex-1 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              ▶️ استكمال
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{lesson.title}</h3>
          <p className="text-sm text-slate-400 mb-3">{unitName}</p>
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            استكمال المشاهدة
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContinueWatchingCard;
