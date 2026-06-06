import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function TakeExam({ exam, student, onBack, onSubmit }) {
  const studentId = student.student?._id || student.studentId || student._id;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(exam.durationMins * 60);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exams/${exam._id}/questions`);
        if (res.ok) setQuestions(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [exam._id]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  useEffect(() => {
    if (started && timeLeft === 0 && !submitting) {
      handleSubmit();
    }
  }, [timeLeft, started, submitting]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!submitting) {
      if (timeLeft > 0 && !window.confirm("هل أنت متأكد من تسليم الامتحان؟")) return;
      setSubmitting(true);

      const formattedAnswers = questions.map(q => ({
        questionId: q._id,
        answer: answers[q._id] || "",
      }));

      try {
        const res = await fetch(`${API_BASE}/api/exams/${exam._id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId: exam._id, studentId, answers: formattedAnswers }),
        });
        if (res.ok) onSubmit();
        else alert("فشل في تسليم الامتحان");
      } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء الاتصال");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  /* ==================== PRE-START SCREEN ==================== */
  if (!started) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl"></div>
        </div>

        <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">{exam.title}</h1>
          </div>

          <div className="px-8 py-8">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-indigo-700">{loading ? "..." : questions.length}</p>
                <p className="text-xs text-indigo-500 mt-0.5">أسئلة</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{exam.durationMins}</p>
                <p className="text-xs text-blue-500 mt-0.5">دقيقة</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-700">{questions.reduce((a, q) => a + (q.points || 0), 0)}</p>
                <p className="text-xs text-slate-500 mt-0.5">نقطة</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 mb-6">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <span>بمجرد البدء، المؤقت سيبدأ ولا يمكن إيقافه.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onBack} className="flex-1 bg-slate-100 text-slate-700 font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-slate-200 transition">رجوع</button>
              <button onClick={() => setStarted(true)} disabled={loading} className="flex-1 bg-indigo-600 text-white font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-200">بدء</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==================== EXAM TAKING ==================== */
  const question = questions[currentQ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0">
              <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <h2 className="text-sm font-bold text-slate-800 truncate">{exam.title}</h2>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Answer progress */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{answeredCount}</span>
              <span>/ {questions.length}</span>
            </div>
            {/* Mobile nav toggle */}
            <button onClick={() => setShowNav(!showNav)} className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
              timeLeft <= 60 ? "bg-red-100 text-red-700 animate-pulse" : timeLeft <= 300 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-6xl mx-auto mt-2">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Question navigator sidebar - desktop */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-32 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 mb-3">الأسئلة</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => (
                <button key={q._id} onClick={() => setCurrentQ(i)} className={`w-10 h-10 rounded-xl text-xs font-bold transition ${
                  i === currentQ ? "bg-indigo-600 text-white shadow-sm" :
                  answers[q._id] ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                  "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-emerald-100"></span>
                <span className="text-slate-500">تم الإجابة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-slate-100"></span>
                <span className="text-slate-500">لم يتم</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question navigator - mobile overlay */}
        {showNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowNav(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">الأسئلة</h3>
                <button onClick={() => setShowNav(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => (
                  <button key={q._id} onClick={() => { setCurrentQ(i); setShowNav(false); }} className={`w-12 h-12 rounded-xl text-xs font-bold transition ${
                    i === currentQ ? "bg-indigo-600 text-white" :
                    answers[q._id] ? "bg-emerald-100 text-emerald-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main question area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400">جاري التحميل...</div>
          ) : question ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">{currentQ + 1}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800 leading-relaxed">{question.text}</h3>
                  <span className="inline-block mt-2 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{question.points} نقطة</span>
                </div>
              </div>

              {question.type === "mcq" && (
                <div className="space-y-2.5">
                  {question.options.map((opt, j) => (
                    <label key={j} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      answers[question._id] === opt ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        answers[question._id] === opt ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
                      }`}>
                        {answers[question._id] === opt && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <input type="radio" name={`q-${question._id}`} checked={answers[question._id] === opt} onChange={() => handleAnswer(question._id, opt)} className="hidden" />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === "truefalse" && (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleAnswer(question._id, "true")}
                    className={`py-4 rounded-xl border text-sm font-semibold transition ${
                      answers[question._id] === "true" ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                    صح
                  </button>
                  <button type="button" onClick={() => handleAnswer(question._id, "false")}
                    className={`py-4 rounded-xl border text-sm font-semibold transition ${
                      answers[question._id] === "false" ? "border-red-500 bg-red-50 text-red-700 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                    خطأ
                  </button>
                </div>
              )}

              {question.type === "text" && (
                <textarea value={answers[question._id] || ""} onChange={e => handleAnswer(question._id, e.target.value)} placeholder="اكتب إجابتك هنا..." rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 resize-none" />
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <button onClick={() => currentQ < questions.length - 1 && setCurrentQ(currentQ + 1)} disabled={currentQ === questions.length - 1} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  التالي
                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => currentQ > 0 && setCurrentQ(currentQ - 1)} disabled={currentQ === 0} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  السابق
                </button>
              </div>
            </div>
          ) : null}

          {/* Submit button */}
          {!loading && (
            <div className="mt-4">
              <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 rounded-2xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-200">
                {submitting ? "جاري التسليم..." : "تسليم الامتحان"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TakeExam;
