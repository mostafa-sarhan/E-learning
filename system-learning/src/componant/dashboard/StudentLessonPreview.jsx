import React from "react";

function LessonPreview({ lesson, onPlay }) {
  if (!lesson) return null;

  const extractVimeoId = (input) => {
    const trimmed = input?.trim() || "";
    const match = trimmed.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : trimmed.replace(/\D/g, "");
  };

  const vimeoId = extractVimeoId(lesson.vimeoId);
  const duration = lesson.duration || 0;

  const formatDuration = (mins) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return remaining > 0 ? `${hours}:${String(remaining).padStart(2, "0")}:00` : `${hours}:00:00`;
    }
    return `0:${String(mins).padStart(2, "0")}:00`;
  };

  return (
    <div className="mb-6 group cursor-pointer" onClick={onPlay}>
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl shadow-slate-300/30 hover:shadow-2xl hover:shadow-slate-400/40 transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-video w-full relative">
          {vimeoId ? (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              title={lesson.title}
              className="w-full h-full pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center group-hover:from-black/90 transition-all duration-300">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-emerald-500 group-hover:scale-110 transition-all duration-300 ring-4 ring-white/20 group-hover:ring-emerald-400/50">
              <svg className="w-10 h-10 text-white mr-1 group-hover:mr-0 transition-all" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>

          {duration > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1 rounded-lg">
              {formatDuration(duration)}
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white font-semibold text-lg truncate drop-shadow-lg">{lesson.title}</h3>
            {lesson.section && (
              <p className="text-slate-300 text-sm mt-0.5">{lesson.section}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LessonPreview;
