import React from "react";
import StudentLessonItem from "./StudentLessonItem";

function UnitCard({ unitName, lessons, unitIndex, getProgress, onSelectLesson, currentLessonId, updateProgress }) {
  const completedCount = lessons.filter(l => getProgress(l._id).progressPercent === 100).length;
  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  const unitProgress = lessons.length > 0
    ? Math.round((completedCount / lessons.length) * 100)
    : 0;

  const formatDuration = (mins) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return remaining > 0 ? `${hours} س ${remaining} د` : `${hours} ساعة`;
    }
    return `${mins} دقيقة`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/50 overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300/50 transition-all duration-300 group hover:-translate-y-1">
      <div className="p-5 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-300">
              {unitIndex + 1}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{unitName}</h3>
              <p className="text-xs text-slate-500">{lessons.length} درس • {formatDuration(totalDuration)}</p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {unitProgress}%
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out"
            style={{ width: `${unitProgress}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {lessons.map((lesson, index) => {
          const progress = getProgress(lesson._id);
          const status = lesson.status || (progress.progressPercent === 100 ? "completed" : progress.progressPercent > 0 ? "in_progress" : "not_started");
          const isCurrent = lesson._id === currentLessonId;

          return (
            <StudentLessonItem
              key={lesson._id}
              lesson={lesson}
              index={index}
              status={status}
              progress={progress}
              isCurrent={isCurrent}
              onSelect={() => onSelectLesson(lesson)}
              onUpdateProgress={updateProgress ? (data) => updateProgress(lesson._id, data) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export default UnitCard;
