import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AuthContext } from "../App";
import { useContext } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function StudentProgressCard({ student, onClick }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?._id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/progress/dashboard/${student._id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setProgress(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [student?._id]);

  const overall = progress?.overall || { totalLessons: 0, completedLessons: 0, progressPercent: 0 };

  return (
    <button
      onClick={() => onClick(student)}
      className="w-full text-right bg-white rounded-2xl border border-slate-200/50 p-5 shadow-sm hover:shadow-xl hover:border-emerald-300/50 transition-all duration-300 group hover:-translate-y-1"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-200 ring-2 ring-white">
          {getInitials(student.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
            {student.name}
          </h3>
          <p className="text-xs text-slate-500">{student.academicYear}</p>
        </div>
        <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-3 bg-slate-200 rounded-full w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded-full w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">التقدم</span>
              <span className="text-xs font-bold text-slate-700">
                {overall.completedLessons} / {overall.totalLessons} درس
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${overall.progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-left">{overall.progressPercent}% مكتمل</p>
          </div>

          {progress?.lastAccessedLesson && (
            <div className="bg-slate-50 rounded-lg p-3 text-right">
              <p className="text-[10px] font-bold text-emerald-600 mb-1">📍 آخر درس تمت مشاهدته</p>
              <p className="text-xs font-medium text-slate-700 truncate">{progress.lastAccessedLesson.title}</p>
              {progress.lastAccessedLesson.progress && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {progress.lastAccessedLesson.progress.progressPercent}% مكتمل
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function StudentProgressDetail({ student, onBack }) {
  const [progressData, setProgressData] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!student?._id) return;
    try {
      setLoading(true);
      const [progressRes, lecturesRes] = await Promise.all([
        fetch(`${API_BASE}/api/progress/dashboard/${student._id}`),
        fetch(`${API_BASE}/api/lectures/year/${encodeURIComponent(student.academicYear)}`),
      ]);

      const progress = progressRes.ok ? await progressRes.json() : null;
      const lecturesData = lecturesRes.ok ? await lecturesRes.json() : [];
      
      setProgressData(progress);
      setLectures(lecturesData);
    } catch (error) {
      console.error("Error fetching student progress detail:", error);
    } finally {
      setLoading(false);
    }
  }, [student?._id, student?.academicYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lecturesBySection = useMemo(() => {
    const groups = {};
    lectures.forEach(l => {
      const section = l.section || "بدون وحدة";
      if (!groups[section]) groups[section] = [];
      groups[section].push(l);
    });
    return groups;
  }, [lectures]);

  const sortedSectionNames = useMemo(() => {
    return Object.keys(lecturesBySection).sort((a, b) => {
      if (a === "بدون وحدة") return 1;
      if (b === "بدون وحدة") return -1;
      const numA = parseInt(a.match(/(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/(\d+)/)?.[1] || "0");
      return numA - numB;
    });
  }, [lecturesBySection]);

  const getProgress = (lessonId) => {
    if (!progressData?.progressMap) return { progressPercent: 0, lastTime: 0, completed: false };
    return progressData.progressMap[lessonId] || { progressPercent: 0, lastTime: 0, completed: false };
  };

  const overall = progressData?.overall || { totalLessons: 0, completedLessons: 0, progressPercent: 0 };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-4">
            <svg className="animate-spin w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-slate-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30" dir="rtl">
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition"
          >
            <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            العودة
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-200">
              {getInitials(student.name)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{student.name}</h1>
              <p className="text-xs text-slate-500">{student.academicYear}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-indigo-200">
            <p className="text-2xl font-bold">{overall.totalLessons}</p>
            <p className="text-xs text-indigo-200 mt-0.5">إجمالي الدروس</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-emerald-200">
            <p className="text-2xl font-bold">{overall.completedLessons}</p>
            <p className="text-xs text-emerald-200 mt-0.5">مكتمل</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-amber-200">
            <p className="text-2xl font-bold">{overall.totalLessons - overall.completedLessons}</p>
            <p className="text-xs text-amber-200 mt-0.5">متبقي</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 text-center text-white shadow-lg shadow-rose-200">
            <p className="text-2xl font-bold">{overall.progressPercent}%</p>
            <p className="text-xs text-rose-200 mt-0.5">التقدم</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">التقدم الإجمالي</h2>
            <span className="text-sm font-bold text-slate-600">
              {overall.completedLessons} / {overall.totalLessons}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 transition-all duration-1000 relative"
              style={{ width: `${overall.progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Last Accessed Lesson */}
        {progressData?.lastAccessedLesson && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 mb-6 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-sm">▶️</span>
              </div>
              <h3 className="font-bold text-sm">آخر درس تمت مشاهدته</h3>
            </div>
            <p className="font-medium text-white mb-1">{progressData.lastAccessedLesson.title}</p>
            <p className="text-xs text-slate-400">
              {progressData.lastAccessedLesson.section} • {progressData.lastAccessedLesson.progress?.progressPercent}% مكتمل
            </p>
          </div>
        )}

        {/* Units/Sections */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">الوحدات والدروس</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedSectionNames.map((section, index) => {
            const sectionLectures = lecturesBySection[section];
            const completedInSection = sectionLectures.filter(l => getProgress(l._id).completed).length;
            const sectionProgress = sectionLectures.length > 0
              ? Math.round((completedInSection / sectionLectures.length) * 100)
              : 0;

            return (
              <div key={section} className="bg-white rounded-2xl border border-slate-200/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="p-5 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-200">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{section}</h3>
                        <p className="text-xs text-slate-500">{sectionLectures.length} درس</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {sectionProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-50">
                  {sectionLectures.map((lecture, idx) => {
                    const prog = getProgress(lecture._id);
                    const status = prog.completed ? "completed" : prog.progressPercent > 0 ? "in_progress" : "not_started";

                    return (
                      <div key={lecture._id} className={`px-5 py-3.5 flex items-center gap-3 ${prog.completed ? "bg-emerald-50/30" : ""}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${prog.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium truncate ${prog.completed ? "text-emerald-700" : "text-slate-700"}`}>
                            {lecture.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>
                              {status === "completed" ? "✔️ مكتمل" : status === "in_progress" ? "▶️ قيد التقدم" : "⏳ لم يبدأ"}
                            </span>
                            {prog.progressPercent > 0 && (
                              <span className="text-emerald-500">{prog.progressPercent}%</span>
                            )}
                          </div>
                        </div>
                        {prog.completed && (
                          <div className="flex-shrink-0">
                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                              ✅
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function StudentProgressReport() {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${API_BASE}/api/students`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setStudents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        s.name?.toLowerCase().includes(query) ||
        s.phone?.includes(query)
      );
    });
  }, [students, searchQuery]);

  if (selectedStudent) {
    return (
      <StudentProgressDetail
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">تقرير تقدم الطلاب</h1>
          <p className="text-slate-500 text-sm">تابع تقدم كل طالب في مشاهدة الدروس</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ابحث بإسم الطالب أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition bg-white/80 backdrop-blur-sm text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-5 h-40 border border-slate-200/50"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <StudentProgressCard
                key={student._id}
                student={student}
                onClick={setSelectedStudent}
              />
            ))}
          </div>
        )}

        {!loading && filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002 2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد نتائج</h3>
            <p className="text-sm text-slate-400">جرب البحث بإسم آخر</p>
          </div>
        )}
      </div>
    </div>
  );
}
