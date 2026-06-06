import React from "react";

function formatDuration(mins) {
  if (!mins) return "";
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}س ${remaining}د` : `${hours}س`;
  }
  return `${mins}د`;
}

function getStatusIcon(status) {
  switch (status) {
    case "completed": return "✔️";
    case "in_progress": return "▶️";
    default: return "⏳";
  }
}

function getStatusText(status) {
  switch (status) {
    case "completed": return "مكتمل";
    case "in_progress": return "قيد التقدم";
    default: return "لم يبدأ";
  }
}

function LessonItem({ lesson, index, status, progress, isCurrent, onSelect, onUpdateProgress }) {
  const duration = lesson.duration || 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-right px-5 py-3.5 flex items-center gap-3 transition-all duration-200 
        hover:bg-slate-50 active:bg-slate-100 group
        ${isCurrent ? "bg-emerald-50/50 border-r-4 border-emerald-500" : ""}
      `}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-emerald-700" : "text-slate-700 group-hover:text-emerald-600"} transition-colors`}>
            {lesson.title}
          </h4>
          {isCurrent && (
            <span className="flex-shrink-0 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              📍 أنت هنا
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            {getStatusIcon(status)} {getStatusText(status)}
          </span>
          {duration > 0 && <span>{formatDuration(duration)}</span>}
          {progress.progressPercent > 0 && progress.progressPercent < 100 && (
            <span className="text-emerald-500 font-medium">{progress.progressPercent}%</span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {status !== "completed" && onUpdateProgress && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateProgress({ progressPercent: 100, completed: true, lastTime: 0 });
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600"
            title="تحديد كمكتمل"
          >
            ✔️
          </button>
        )}
        <svg className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </button>
  );
}

export default LessonItem;
