import React, { useState } from "react";

function HeaderCard({ studentName, progressPercent, completedLessons, totalLessons, loading }) {
  const motivationalTexts = [
    "استمر في التقدم، أنت تبدع!",
    "كل خطوة تقربك من هدفك",
    "أحسنت! واصل التعلم",
    "أنت على الطريق الصحيح",
  ];

  const [randomMotivation] = useState(() => 
    motivationalTexts[Math.floor(Math.random() * motivationalTexts.length)]
  );

  const today = new Date();
  const hour = today.getHours();
  let greeting = "صباح الخير";
  if (hour >= 12 && hour < 17) greeting = "مساء الخير";
  else if (hour >= 17) greeting = "مساء الخير";

  if (loading) {
    return (
      <div className="mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200/40 relative overflow-hidden animate-pulse">
        <div className="h-32 flex items-center justify-center">
          <p className="text-indigo-200">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200/40 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-300/50 group">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 group-hover:scale-110 transition-transform duration-700"></div>
      </div>
      <div className="relative z-10">
        <h1 className="text-xl font-bold mb-1">
          {greeting}، {studentName?.split(" ")[0]} 👋
        </h1>
        <p className="text-indigo-200 text-sm mb-4">{randomMotivation}</p>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">التقدم</span>
            <span className="text-sm font-bold">
              {completedLessons} / {totalLessons} درس مكتمل
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 transition-all duration-1000 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-2 text-left">{progressPercent}% مكتمل</p>
        </div>
      </div>
    </div>
  );
}

export default HeaderCard;
