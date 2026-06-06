import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TakeExam from "../TakeExam";
import StudentHeaderCard from "./StudentHeaderCard";
import StudentContinueWatchingCard from "./StudentContinueWatchingCard";
import StudentTabs from "./StudentTabs";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

// Simple toast notification component
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const bgColor = type === "error" ? "bg-rose-500" : type === "success" ? "bg-emerald-500" : "bg-slate-800";
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-down`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="text-white/80 hover:text-white">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

function StudentDashboard({ student, onLogout }) {
  const studentData = student.student || student;
  const userId = student.student?._id || student.studentId;
  const academicYear = studentData.academicYear;

  const [exams, setExams] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [examResults, setExamResults] = useState([]);
  
  // Clear results when exams change (safety check)
  useEffect(() => {
    if (examResults.length === 0 && !selectedResult) return;
    
    const validExamIds = new Set(
      exams.filter(e => e.resultsPublished === true).map(e => e._id.toString())
    );
    
    // Filter examResults
    const filteredResults = examResults.filter(result => {
      const examId = result.exam?._id?.toString() || result.exam?.toString();
      const isValid = examId && validExamIds.has(examId);
      if (!isValid) {
        console.log('Filtering out result - exam not published:', examId);
      }
      return isValid;
    });
    
    if (filteredResults.length !== examResults.length) {
      console.log('Clearing', examResults.length - filteredResults.length, 'unpublished results');
      setExamResults(filteredResults);
    }
    
    // Also clear selectedResult if its exam is not published
    if (selectedResult) {
      const examId = selectedResult.exam?._id?.toString() || selectedResult.exam?.toString();
      if (examId && !validExamIds.has(examId)) {
        console.log('Clearing selectedResult - exam not published:', examId);
        setSelectedResult(null);
        showToast("النتائج غير متاحة حالياً", "error");
      }
    }
  }, [exams]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [currentLecture, setCurrentLecture] = useState(null);
  
  // Progress state from backend
  const [progressMap, setProgressMap] = useState({});
  const [lastAccessedLesson, setLastAccessedLesson] = useState(null);
  
  // Calculate progress directly from progressMap and lectures
  const overallProgress = useMemo(() => {
    const totalLessons = lectures.length;
    const completedLessons = Object.values(progressMap).filter(p => p && p.completed).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { totalLessons, completedLessons, progressPercent };
  }, [progressMap, lectures]);
  
  // UI state
  const [toast, setToast] = useState({ message: "", type: "" });
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Show toast notification
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  }, []);

  // Fetch progress from backend
  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/progress/dashboard/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProgressMap(data.progressMap || {});
        setLastAccessedLesson(data.lastAccessedLesson || null);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
      showToast("فشل في تحميل التقدم", "error");
    }
  }, [userId, showToast]);

  // Optimistic update progress on backend
  const updateProgress = useCallback(async (lessonId, data) => {
    if (!userId) return;
    
    // Optimistic update - update UI immediately
    const optimisticUpdate = {
      ...data,
      updatedAt: Date.now(),
    };
    setProgressMap(prev => ({
      ...prev,
      [lessonId]: { ...prev[lessonId], ...optimisticUpdate }
    }));

    // Debounce saves to avoid too many requests
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const res = await fetch(`${API_BASE}/api/progress/student/${userId}/lecture/${lessonId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          // Update with server response
          setProgressMap(prev => ({
            ...prev,
            [lessonId]: {
              progressPercent: updated.progressPercent,
              lastTime: updated.lastTime,
              completed: updated.completed,
              updatedAt: new Date(updated.updatedAt).getTime(),
            }
          }));
          showToast("تم حفظ التقدم", "success");
        } else {
          showToast("فشل في حفظ التقدم", "error");
        }
      } catch (error) {
        console.error("Error updating progress:", error);
        showToast("فشل في حفظ التقدم", "error");
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [userId, showToast]);

  // Get progress for a specific lesson
  const getProgress = useCallback((lessonId) => {
    return progressMap[lessonId] || { progressPercent: 0, lastTime: 0, completed: false, updatedAt: 0 };
  }, [progressMap]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [ex, lc] = await Promise.all([
        fetch(`${API_BASE}/api/students/${userId}/exams`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/api/lectures/year/${encodeURIComponent(academicYear)}`).then(r => r.ok ? r.json() : []),
      ]);
      
      const yearExams = ex.filter(e => e.academicYear === academicYear);
      setExams(yearExams);
      setLectures(lc);

      // Fetch progress from backend
      await fetchProgress();

      // Only show results for exams that are BOTH submitted AND published
      const publishedExams = yearExams.filter(e => {
        if (!e.isSubmitted) return false;
        // Handle case where resultsPublished is undefined (old exams)
        const published = e.resultsPublished ?? false;
        return published === true;
      });
      
      // Clear previous results first
      setExamResults([]);
      
      if (publishedExams.length > 0) {
        // Fetch ONLY the current student's results for each published exam
        const results = await Promise.all(
          publishedExams.map(exam =>
            fetch(`${API_BASE}/api/exams/${exam._id}/results/${userId}`)
              .then(async (r) => {
                if (r.status === 403) {
                  console.log(`Results not published for exam ${exam._id}`);
                  return null;
                }
                if (!r.ok) return null;
                const data = await r.json();
                // Ensure this result belongs to current student
                if (data.student?._id === userId || data.student === userId) {
                  return data;
                }
                return null;
              })
              .catch(() => null)
          )
        );
        const validResults = results.filter(Boolean);
        console.log('Fetched current student results:', validResults.length);
        setExamResults(validResults);
      } else {
        console.log('No published exams found. examResults cleared.');
      }

      // Pick first in-progress or last accessed as current (use progressMap after fetchProgress updates it)
      setTimeout(() => {
        const pMap = progressMap;
        const inProgress = lc.find(l => {
          const p = pMap[l._id];
          return p && !p.completed && p.progressPercent > 0;
        });
        if (inProgress) setCurrentLecture(inProgress);
        else if (lc.length > 0) setCurrentLecture(lc[0]);
      }, 0);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showToast("حدث خطأ أثناء تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, academicYear, fetchProgress, showToast]);

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

  const averageScore = useMemo(() => {
    if (examResults.length === 0) return 0;
    const total = examResults.reduce((sum, r) => sum + (r.score || r.percentage || 0), 0);
    return Math.round(total / examResults.length);
  }, [examResults]);

  const extractVimeoId = (input) => {
    const trimmed = input?.trim() || "";
    const match = trimmed.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : trimmed.replace(/\D/g, "");
  };

  // Video player with time tracking
  const handleVideoTimeUpdate = useCallback((lessonId, currentTime, duration) => {
    if (!userId || !lessonId) return;
    
    // If video ended (within 2 seconds of end), mark as complete
    if (duration > 0 && Math.abs(currentTime - duration) < 2) {
      updateProgress(lessonId, { progressPercent: 100, completed: true, lastTime: Math.floor(currentTime) });
      showToast("تم إكمال المحاضرة بنجاح! ✅", "success");
      return;
    }
    
    // Save every 30 seconds
    const progress = getProgress(lessonId);
    if (Math.abs(currentTime - (progress.lastTime || 0)) > 30) {
      const percent = duration > 0 ? Math.floor((currentTime / duration) * 100) : 0;
      updateProgress(lessonId, { lastTime: Math.floor(currentTime), progressPercent: percent });
    }
  }, [userId, getProgress, updateProgress, showToast]);

  if (activeExam && !submissionResult) {
    return <TakeExam exam={activeExam} student={student} onBack={() => setActiveExam(null)} onSubmit={() => setSubmissionResult({ examTitle: activeExam.title })} />;
  }

  if (submissionResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/30 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl shadow-emerald-200/20 w-full max-w-md overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 px-8 py-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')]"></div>
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto relative z-10 ring-4 ring-white/30">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <div className="px-8 py-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">تم التسليم بنجاح</h1>
            <p className="text-slate-500 mt-2">{submissionResult.examTitle}</p>
            <button onClick={() => { setSubmissionResult(null); setActiveExam(null); }} className="mt-6 w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm px-4 py-3.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition shadow-lg shadow-emerald-200">العودة للوحة التحكم</button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedLecture) {
    const vimeoId = extractVimeoId(selectedLecture.vimeoId);
    const progress = getProgress(selectedLecture._id);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
        <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSelectedLecture(null)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition">
            <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            العودة
          </button>
          <div className="flex items-center gap-3">
            {selectedLecture.section && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{selectedLecture.section}</span>
            )}
            <h2 className="text-sm font-semibold text-white truncate max-w-xs">{selectedLecture.title}</h2>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="rounded-2xl overflow-hidden bg-black shadow-2xl shadow-emerald-500/10 mb-8 ring-1 ring-white/10" style={{ position: "relative", paddingTop: "56.25%" }}>
            <iframe
              id="vimeo-player"
              src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1`}
              frameBorder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              title={selectedLecture.title}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              onLoad={() => {
                const iframe = document.getElementById('vimeo-player');
                if (!iframe || !iframe.contentWindow) return;

                // Use Vimeo postMessage API (no SDK needed)
                const playerOrigin = '*';
                
                // Listen for messages from Vimeo
                const messageHandler = (event) => {
                  if (event.origin !== 'https://player.vimeo.com') return;
                  
                  try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'ready') {
                      // Subscribe to events
                      iframe.contentWindow?.postMessage(JSON.stringify({
                        method: 'addEventListener',
                        value: 'playProgress'
                      }), 'https://player.vimeo.com');
                      
                      iframe.contentWindow?.postMessage(JSON.stringify({
                        method: 'addEventListener',
                        value: 'finish'
                      }), 'https://player.vimeo.com');
                      
                      // Resume from last time
                      if (progress.lastTime > 0) {
                        iframe.contentWindow?.postMessage(JSON.stringify({
                          method: 'setCurrentTime',
                          value: progress.lastTime
                        }), 'https://player.vimeo.com');
                      }
                    }
                    
                    if (data.event === 'playProgress' && data.data) {
                      handleVideoTimeUpdate(selectedLecture._id, data.data.seconds, data.data.duration);
                    }
                    
                    if (data.event === 'finish') {
                      handleVideoTimeUpdate(selectedLecture._id, progress.lastTime || 0, progress.lastTime || 0);
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                };
                
                window.addEventListener('message', messageHandler);
                
                // Initialize player
                iframe.contentWindow?.postMessage(JSON.stringify({ method: 'addEventListener', value: 'ready' }), 'https://player.vimeo.com');
                
                return () => window.removeEventListener('message', messageHandler);
              }}
            />
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{selectedLecture.title}</h1>
              {selectedLecture.section && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{selectedLecture.section}</span>
              )}
            </div>
            {selectedLecture.description && <p className="text-slate-400 leading-relaxed">{selectedLecture.description}</p>}
             
            {/* Progress indicator */}
            <div className="mt-4 flex items-center gap-4">
              {saving && <span className="text-xs text-slate-400">جاري الحفظ...</span>}
              <span className="text-xs text-slate-400">
                {progress.progressPercent === 100 ? "✅ مكتمل" : `التقدم: ${progress.progressPercent || 0}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30" dir="rtl">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />
      
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-200 ring-2 ring-white">
              {studentData.name?.charAt(0) || "?"}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{studentData.name}</p>
              <p className="text-xs text-slate-500 font-medium">{academicYear || "غير محدد"}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600 transition bg-slate-50 hover:bg-rose-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200">
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m-8.25-5.25a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25m10.5-7.5h-8.25" /></svg>
            <span className="hidden sm:inline font-medium">خروج</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <StudentHeaderCard
          studentName={studentData.name}
          progressPercent={overallProgress.progressPercent}
          completedLessons={overallProgress.completedLessons}
          totalLessons={overallProgress.totalLessons}
          loading={loading}
        />

        {lastAccessedLesson && (
          <StudentContinueWatchingCard
            lesson={lastAccessedLesson}
            progress={lastAccessedLesson.progress}
            onContinue={() => setSelectedLecture(lastAccessedLesson)}
          />
        )}

        <StudentTabs
          loading={loading}
          lecturesBySection={lecturesBySection}
          sortedSectionNames={sortedSectionNames}
          exams={exams}
          examResults={examResults}
          getProgress={getProgress}
          onSelectLecture={setSelectedLecture}
          onStartExam={setActiveExam}
          onViewResult={(result) => {
            // Safety check: only show result if exam is published
            const examId = result.exam?._id || result.exam;
            const exam = exams.find(e => e._id === examId || e._id.toString() === examId);
            if (exam && exam.resultsPublished === true) {
              setSelectedResult(result);
            } else {
              showToast("النتائج غير متاحة حالياً", "error");
            }
          }}
          formatDate={formatDate}
          updateProgress={updateProgress}
        />
      </div>

      {selectedResult && (
        <ResultModal result={selectedResult} onClose={() => setSelectedResult(null)} />
      )}
    </div>
  );
}

function ResultModal({ result, onClose }) {
  if (!result) return null;
  
  // Safety check: don't show if exam results aren't published
  const examData = typeof result.exam === 'object' ? result.exam : null;
  const examPublished = examData?.resultsPublished ?? false;
  if (!examPublished) return null;
  
  // Use backend-calculated fields, fallback to frontend calculation  
  const score = result.percentage ?? (result.totalPoints > 0 ? Math.round((result.score / result.totalPoints) * 100) : 0);
  const correctAnswers = result.correctAnswers ?? result.answers?.filter(a => a.isCorrect).length ?? 0;
  const wrongAnswers = result.wrongAnswers ?? result.answers?.filter(a => !a.isCorrect).length ?? 0;
  const unanswered = result.unanswered ?? Math.max(0, (examData?.totalQuestions ?? result.answers?.length ?? 0) - (result.answers?.length ?? 0));
  const status = score >= 50 ? "passed" : "failed";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`bg-gradient-to-r ${status === "passed" ? "from-emerald-600 to-teal-600" : "from-rose-600 to-pink-600"} px-8 py-8 text-center relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className={`w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto ring-4 ring-white/30 ${status === "passed" ? "animate-bounce" : ""}`}>
              {status === "passed" ? (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-4">{status === "passed" ? "ناجح" : "راسب"}</h2>
            <p className="text-white/80 text-sm mt-1">{result.examTitle}</p>
          </div>
        </div>
        <div className="px-8 py-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 ring-4 ring-slate-200">
              <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{score}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-600">{correctAnswers}</p>
              <p className="text-xs text-emerald-700 mt-1">إجابة صحيحة</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100">
              <p className="text-2xl font-bold text-rose-600">{wrongAnswers}</p>
              <p className="text-xs text-rose-700 mt-1">إجابة خاطئة</p>
            </div>
          </div>
          {unanswered > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100 mb-6">
              <p className="text-2xl font-bold text-amber-600">{unanswered}</p>
              <p className="text-xs text-amber-700 mt-1">بدون إجابة</p>
            </div>
          )}
        </div>
        <div className="px-8 pb-6">
          <button onClick={onClose} className="w-full bg-slate-100 text-slate-700 font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-slate-200 transition">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
