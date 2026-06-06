import React, { useState } from "react";
import StudentUnitCard from "./StudentUnitCard";

function StudentTabs({
  loading,
  lecturesBySection,
  sortedSectionNames,
  exams,
  examResults,
  getProgress,
  onSelectLecture,
  onStartExam,
  onViewResult,
  formatDate,
  updateProgress,
}) {
  const [activeTab, setActiveTab] = useState("lessons");

  const getExamInfo = (exam) => {
    const startObj = new Date(exam.date);
    const [hours, minutes] = exam.startTime.split(":").map(Number);
    startObj.setHours(hours, minutes, 0, 0);
    const endObj = new Date(startObj.getTime() + exam.durationMins * 60000);
    const now = new Date();
    if (exam.isSubmitted) return { status: "تم التسليم", badge: "bg-emerald-100 text-emerald-700", icon: "check", category: "past" };
    if (now >= startObj && now <= endObj) return { status: "متاح الآن", badge: "bg-green-100 text-green-700", icon: "play", category: "active" };
    if (now < startObj) return { status: "قادم", badge: "bg-blue-100 text-blue-700", icon: "clock", category: "future" };
    return { status: "انتهى", badge: "bg-slate-100 text-slate-600", icon: "x", category: "past" };
  };

  const getTimeRemaining = (exam) => {
    const startObj = new Date(exam.date);
    const [hours, minutes] = exam.startTime.split(":").map(Number);
    startObj.setHours(hours, minutes, 0, 0);
    const diffMs = startObj - new Date();
    if (diffMs <= 0) return null;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffDays > 0) return `${diffDays} يوم و ${diffHours} ساعة`;
    return `${diffHours > 0 ? diffHours + " ساعة و " : ""}${diffMins} دقيقة`;
  };

  const activeCount = exams.filter(e => getExamInfo(e).category === "active").length;
  const submittedCount = exams.filter(e => e.isSubmitted).length;
  const futureOnlyCount = exams.filter(e => getExamInfo(e).category === "future").length;
  const futureExams = exams.filter(e => getExamInfo(e).category === "future" || getExamInfo(e).category === "active");
  const pastExams = exams.filter(e => getExamInfo(e).category === "past");

  // Calculate average and highest from current student's results only
  const studentScores = examResults.map(r => r.percentage ?? r.score ?? 0);
  const averageScore = studentScores.length > 0 
    ? Math.round(studentScores.reduce((a, b) => a + b, 0) / studentScores.length) 
    : 0;
  const highestScore = studentScores.length > 0
    ? Math.max(...studentScores)
    : 0;

  return (
    <div className="mt-6">
      <div className="flex gap-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-1.5 shadow-sm mb-6 overflow-x-auto">
        {[
          {
            id: "lessons",
            label: "المحاضرات",
            icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
            count: Object.values(lecturesBySection).flat().length,
            activeClass: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200",
            inactiveClass: "text-slate-600 hover:bg-slate-50",
            badgeClass: "bg-emerald-100 text-emerald-700",
          },
          {
            id: "exams",
            label: "الامتحانات",
            icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
            count: exams.length,
            activeClass: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200",
            inactiveClass: "text-slate-600 hover:bg-slate-50",
            badgeClass: "bg-indigo-100 text-indigo-700",
          },
          {
            id: "results",
            label: "النتائج",
            icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
            count: examResults.length,
            activeClass: "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-200",
            inactiveClass: "text-slate-600 hover:bg-slate-50",
            badgeClass: "bg-rose-100 text-rose-700",
          },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === tab.id ? tab.activeClass : tab.inactiveClass}`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
            </svg>
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : tab.badgeClass}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-200/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-4">
            <svg className="animate-spin w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-slate-500 mt-3 text-sm font-medium">جاري التحميل...</p>
        </div>
      ) : (
        <>
          {activeTab === "lessons" && (
            <>
              {Object.keys(lecturesBySection).length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-200/50">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد محاضرات</h3>
                  <p className="text-sm text-slate-400">ستظهر هنا عندما يضيفها المعلم</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedSectionNames.map((section, index) => (
                    <StudentUnitCard
                      key={section}
                      unitName={section}
                      lessons={lecturesBySection[section]}
                      unitIndex={index}
                      getProgress={getProgress}
                      onSelectLesson={onSelectLecture}
                      currentLessonId={null}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "exams" && (
            <>
              {exams.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-200/50">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد امتحانات</h3>
                  <p className="text-sm text-slate-400">سيتم إشعارك عند إضافة امتحان جديد</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-indigo-200">
                      <p className="text-2xl font-bold">{exams.length}</p>
                      <p className="text-xs text-indigo-200 mt-0.5">إجمالي</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-blue-200">
                      <p className="text-2xl font-bold">{futureOnlyCount}</p>
                      <p className="text-xs text-blue-200 mt-0.5">قادمة</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-emerald-200">
                      <p className="text-2xl font-bold">{activeCount}</p>
                      <p className="text-xs text-emerald-200 mt-0.5">متاحة الآن</p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-slate-200">
                      <p className="text-2xl font-bold">{submittedCount}</p>
                      <p className="text-xs text-slate-200 mt-0.5">تم تسليمها</p>
                    </div>
                  </div>

                  {futureExams.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h2 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        القادمة والحالية
                      </h2>
                      {futureExams.map(exam => {
                        const info = getExamInfo(exam);
                        const canTake = !exam.isSubmitted && info.category === "active";
                        const timeRemaining = getTimeRemaining(exam);
                        return (
                          <div key={exam._id} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${info.category === "active" ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200/50"}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${info.badge}`}>{info.status}</span>
                                  {info.category === "active" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                </div>
                                <h3 className="font-semibold text-slate-800">{exam.title}</h3>
                                <div className="mt-2 space-y-1 text-sm text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span>{formatDate(exam.date)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{exam.startTime} — {exam.durationMins} دقيقة</span>
                                  </div>
                                  {timeRemaining && (
                                    <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                      {timeRemaining}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {canTake && (
                                <button onClick={() => onStartExam(exam)} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition flex-shrink-0 shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95">
                                  ابدأ الآن
                                </button>
                              )}
                              {info.category === "future" && !exam.isSubmitted && (
                                <div className="flex-shrink-0 text-center">
                                  <span className="inline-flex px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {timeRemaining ? `بعد ${timeRemaining}` : "في الموعد"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pastExams.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        السابقة
                      </h2>
                      {pastExams.map(exam => {
                        const info = getExamInfo(exam);
                        return (
                          <div key={exam._id} className="bg-white rounded-2xl border border-slate-200/50 p-5 shadow-sm opacity-75 hover:opacity-100 transition hover:shadow-md">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${info.badge}`}>{info.status}</span>
                                <h3 className="font-semibold text-slate-800 mt-2">{exam.title}</h3>
                                <p className="text-xs text-slate-400 mt-1">{formatDate(exam.date)} — {exam.startTime}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "results" && (
            <>
              {examResults.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-slate-200/50">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد نتائج بعد</h3>
                  <p className="text-sm text-slate-400">ستظهر نتائج امتحاناتك هنا بعد تسليمها</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-indigo-200">
                      <p className="text-2xl font-bold">{examResults.length}</p>
                      <p className="text-xs text-indigo-200 mt-0.5">امتحانات مُقدمة</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-emerald-200">
                      <p className="text-2xl font-bold">{averageScore}%</p>
                      <p className="text-xs text-emerald-200 mt-0.5">متوسط الدرجات</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-amber-200">
                      <p className="text-2xl font-bold">{highestScore}%</p>
                      <p className="text-xs text-amber-200 mt-0.5">أعلى درجة</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-rose-200">
                      <p className="text-2xl font-bold">{examResults.filter(r => (r.score ?? r.percentage ?? 0) >= 50).length}</p>
                      <p className="text-xs text-rose-200 mt-0.5">ناجح</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {examResults.map((result, index) => {
                      // Use backend-calculated fields
                      const score = result.percentage ?? (result.totalPoints > 0 ? Math.round((result.score / result.totalPoints) * 100) : 0);
                      const correct = result.correctAnswers ?? result.answers?.filter(a => a.isCorrect).length ?? 0;
                      const wrong = result.wrongAnswers ?? result.answers?.filter(a => !a.isCorrect).length ?? 0;
                      const status = score >= 50 ? "passed" : "failed";
                      
                      return (
                        <button
                          key={result._id || index}
                          onClick={() => onViewResult(result)}
                          className="w-full bg-white rounded-2xl border border-slate-200/50 p-5 shadow-sm hover:shadow-lg transition-all duration-300 text-right group hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${status === "passed" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                  {status === "passed" ? "ناجح" : "راسب"}
                                </span>
                                <span className="text-xs text-slate-400">{result.submittedAt ? formatDate(result.submittedAt) : ""}</span>
                              </div>
                              <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition">{result.exam?.title || result.examTitle}</h3>
                              <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                  {correct} صحيحة
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                  {wrong} خاطئة
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${score >= 50 ? "bg-gradient-to-br from-emerald-100 to-emerald-50" : "bg-gradient-to-br from-rose-100 to-rose-50"}`}>
                                <span className={`text-xl font-bold ${score >= 50 ? "text-emerald-600" : "text-rose-600"}`}>{score}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${score >= 50 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-rose-500 to-pink-500"}`} style={{ width: `${score}%` }}></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default StudentTabs;
