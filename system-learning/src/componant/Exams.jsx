import React, { useState, useEffect, useCallback, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const GRADES = ["الصف الاول", "الصف الثانى", "الصف الثالث"];
const GRADE_COLORS = {
  "الصف الاول": { bg: "from-blue-500 to-cyan-500", badge: "bg-blue-100 text-blue-700", light: "bg-blue-50", border: "border-blue-200", ring: "focus:ring-blue-500/20 focus:border-blue-500" },
  "الصف الثانى": { bg: "from-violet-500 to-purple-500", badge: "bg-violet-100 text-violet-700", light: "bg-violet-50", border: "border-violet-200", ring: "focus:ring-violet-500/20 focus:border-violet-500" },
  "الصف الثالث": { bg: "from-amber-500 to-orange-500", badge: "bg-amber-100 text-amber-700", light: "bg-amber-50", border: "border-amber-200", ring: "focus:ring-amber-500/20 focus:border-amber-500" },
};

function gradeShort(g) {
  if (!g) return "";
  if (g.includes("الاول")) return "1st";
  if (g.includes("الثاني") || g.includes("الثانى")) return "2nd";
  if (g.includes("الثالث")) return "3rd";
  return g;
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function getExamStatus(dateString, startTimeString, durationMins) {
  if (!dateString || !startTimeString) return { text: "غير محدد", color: "bg-slate-100 text-slate-600" };
  const [hours, minutes] = startTimeString.split(":").map(Number);
  const startObj = new Date(dateString);
  startObj.setHours(hours, minutes, 0, 0);
  const endObj = new Date(startObj.getTime() + durationMins * 60000);
  const now = new Date();
  if (now < startObj) return { text: "قادم", color: "bg-blue-100 text-blue-800" };
  if (now >= startObj && now <= endObj) return { text: "جاري الآن", color: "bg-amber-100 text-amber-800" };
  return { text: "منتهي", color: "bg-slate-100 text-slate-600" };
}

function Toast({ show, message, type }) {
  if (!show) return null;
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-slide-down ${type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={type === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"} /></svg>
      {message}
    </div>
  );
}

const emptyQuestion = { text: "", type: "mcq", options: ["", "", "", ""], correctAnswer: "", points: 1 };

function QuestionManager({ exam, onBack, showToast }) {
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`${API_BASE}/api/exams/${exam._id}/questions`);
      if (res.ok) setQuestions(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingQuestions(false); }
  }, [exam._id]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.text || !questionForm.correctAnswer) {
      showToast(questionForm.type === "truefalse" ? "الرجاء اختيار الإجابة الصحيحة" : "الرجاء تعبئة نص السؤال والإجابة الصحيحة", "error");
      return;
    }
    setSubmitting(true);
    const payload = {
      examId: exam._id,
      text: questionForm.text,
      type: questionForm.type,
      correctAnswer: questionForm.correctAnswer,
      points: questionForm.points,
    };
    if (questionForm.type === "mcq") payload.options = questionForm.options;

    const url = editingQuestionId ? `${API_BASE}/api/exams/questions/${editingQuestionId}` : `${API_BASE}/api/exams/${exam._id}/questions`;
    const method = editingQuestionId ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setQuestionForm(emptyQuestion);
        setEditingQuestionId(null);
        showToast(editingQuestionId ? "تم تعديل السؤال" : "تم إضافة السؤال", "success");
        fetchQuestions();
      } else {
        const err = await res.json();
        showToast(err.message || "فشل في حفظ السؤال", "error");
      }
    } catch { showToast("حدث خطأ", "error"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm("حذف هذا السؤال؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/exams/questions/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) { fetchQuestions(); showToast("تم حذف السؤال", "success"); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">إدارة الأسئلة: {exam.title}</h2>
            <p className="text-xs text-slate-500">{exam.group?.name || "مجموعة محذوفة"} · {exam.academicYear}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">{questions.length} سؤال</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveQuestion} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-6">
            <h3 className="font-bold text-slate-800 mb-4">{editingQuestionId ? "تعديل السؤال" : "سؤال جديد"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">نوع السؤال</label>
                <div className="grid grid-cols-2 gap-2">
                  {["mcq", "truefalse"].map(type => (
                    <button key={type} type="button" onClick={() => setQuestionForm(prev => ({ ...prev, type, correctAnswer: type === "truefalse" ? "true" : "", options: ["", "", "", ""] }))} className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${questionForm.type === type ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {type === "mcq" ? "اختيار من متعدد" : "صح / خطأ"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">نص السؤال</label>
                <textarea value={questionForm.text} onChange={e => setQuestionForm(prev => ({ ...prev, text: e.target.value }))} rows={3} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 resize-none" placeholder="اكتب السؤال..." />
              </div>
              {questionForm.type === "mcq" && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">الخيارات (اضغط لتحديد الصحيح)</label>
                  {questionForm.options.map((opt, i) => {
                    const isCorrect = questionForm.correctAnswer === opt && opt !== "";
                    return (
                      <div key={i} onClick={() => setQuestionForm(prev => ({ ...prev, correctAnswer: opt }))} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${isCorrect ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                          {isCorrect && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <input type="text" value={opt} onClick={e => e.stopPropagation()} onChange={e => { const n = [...questionForm.options]; n[i] = e.target.value; setQuestionForm(p => ({ ...p, options: n })); }} placeholder={`الخيار ${i + 1}`} required className="flex-1 bg-transparent text-sm outline-none" />
                      </div>
                    );
                  })}
                </div>
              )}
              {questionForm.type === "truefalse" && (
                <div className="grid grid-cols-2 gap-2">
                  {["true", "false"].map(val => (
                    <button key={val} type="button" onClick={() => setQuestionForm(prev => ({ ...prev, correctAnswer: val }))} className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition ${questionForm.correctAnswer === val ? (val === "true" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {val === "true" ? "صح" : "خطأ"}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">النقاط</label>
                <input type="number" min="1" value={questionForm.points} onChange={e => setQuestionForm(p => ({ ...p, points: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 text-white font-semibold text-sm px-3 py-2.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60">
                  {submitting ? "..." : editingQuestionId ? "حفظ التعديل" : "إضافة السؤال"}
                </button>
                {editingQuestionId && <button type="button" onClick={() => { setQuestionForm(emptyQuestion); setEditingQuestionId(null); }} className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">إلغاء</button>}
              </div>
            </div>
          </form>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-bold text-slate-800">قائمة الأسئلة</h3>
            </div>
            {loadingQuestions ? (
              <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">لا توجد أسئلة بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {questions.map((q, i) => (
                  <div key={q._id} className="p-4 hover:bg-slate-50/50 transition group">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm">{q.text}</p>
                        <div className="mt-2 space-y-1">
                          {q.type === "mcq" && q.options.filter(o => o).map((opt, j) => (
                            <div key={j} className={`flex items-center gap-2 text-xs ${opt === q.correctAnswer ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${opt === q.correctAnswer ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                                {opt === q.correctAnswer && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                          {q.type === "truefalse" && (
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${q.correctAnswer === "true" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {q.correctAnswer === "true" ? "صح" : "خطأ"}
                            </span>
                          )}
                        </div>
                        <span className="inline-block mt-2 text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{q.points} نقطة</span>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                        <button onClick={() => { setQuestionForm({ text: q.text, type: q.type, options: q.type === "mcq" ? q.options : ["", "", "", ""], correctAnswer: q.correctAnswer, points: q.points }); setEditingQuestionId(q._id); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteQuestion(q._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamResults({ exam, onBack, showToast }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/exams/${exam._id}/results`);
        if (res.ok) setResults(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [exam._id]);

  const avgScore = results.length > 0 ? Math.round(results.reduce((sum, s) => sum + (s.totalPoints > 0 ? (s.score / s.totalPoints) * 100 : 0), 0) / results.length) : 0;
  const passed = results.filter(s => s.totalPoints > 0 && (s.score / s.totalPoints) >= 0.5).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">نتائج: {exam.title}</h2>
          <p className="text-xs text-slate-500">{results.length} طالب قدم الامتحان</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">إجمالي المشاركين</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{results.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">متوسط النتيجة</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{avgScore}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">نسبة النجاح</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{results.length > 0 ? Math.round((passed / results.length) * 100) : 0}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80">
          <h3 className="font-bold text-slate-800">تفاصيل النتائج</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-slate-400">لم يقدم أي طالب هذا الامتحان بعد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">الطالب</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-center">الدرجة</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">تاريخ التسليم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((sub, i) => {
                  const pct = sub.totalPoints > 0 ? Math.round((sub.score / sub.totalPoints) * 100) : 0;
                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{(sub.student?.name || "?").charAt(0)}</div>
                          <span className="font-medium text-slate-800">{sub.student?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 50 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} /></div>
                          <span className={`text-xs font-bold ${pct >= 50 ? "text-emerald-700" : "text-red-700"}`}>{sub.score}/{sub.totalPoints}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(sub.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Exams() {
  const [groups, setGroups] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [showForm, setShowForm] = useState(false);
  const [formGrade, setFormGrade] = useState(GRADES[0]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [managingExam, setManagingExam] = useState(null);
const [showResults, setShowResults] = useState(null);
const [resultsPublished, setResultsPublished] = useState({});
const [expandedYears, setExpandedYears] = useState({});
const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
const [sendingWhatsApp, setSendingWhatsApp] = useState(null);
const [whatsAppSent, setWhatsAppSent] = useState(() => {
  try {
    const saved = localStorage.getItem('whatsAppSent');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
});

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-groups-dropdown]")) {
        setShowGroupsDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, examsRes] = await Promise.all([fetch(`${API_BASE}/api/groups`), fetch(`${API_BASE}/api/exams`)]);
      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (examsRes.ok) {
        const raw = await examsRes.json();
        setExams(raw);
        const published = {};
        raw.forEach(e => { if (e.resultsPublished) published[e._id] = true; });
        setResultsPublished(published);
      }
    } catch (e) { console.error("Failed to fetch data:", e); showToast("فشل في تحميل البيانات", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableTerms = useMemo(() => {
    return GRADES.filter(g => groups.some(gr => gr.academicYear === g));
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!formGrade) return [];
    return groups.filter(g => g.academicYear === formGrade);
  }, [groups, formGrade]);

  useEffect(() => { setSelectedGroups([]); }, [formGrade]);

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const selectAllGroups = () => {
    setSelectedGroups(filteredGroups.map(g => g._id));
  };

  const clearAllGroups = () => {
    setSelectedGroups([]);
  };

  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!title || !formGrade || selectedGroups.length === 0 || !date || !startTime || !durationMins) {
      showToast("الرجاء تعبئة جميع الحقول واختيار مجموعة واحدة", "error"); return;
    }
    setSubmitting(true);
    try {
      // Create only ONE exam for the selected group
      const groupId = selectedGroups[0];
      const res = await fetch(`${API_BASE}/api/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, academicYear: formGrade, group: groupId, date, startTime, durationMins }),
      });
      if (res.ok) {
        setTitle(""); setDate(""); setStartTime(""); setDurationMins(""); setSelectedGroups([]); setShowForm(false);
        showToast("تم جدولة الامتحان بنجاح", "success");
        fetchData();
      } else {
        showToast("فشل في جدولة الامتحان", "error");
      }
    } catch { showToast("حدث خطأ", "error"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الامتحان؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/exams/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) { fetchData(); showToast("تم حذف الامتحان", "success"); }
    } catch (e) { console.error(e); showToast("حدث خطأ أثناء الحذف", "error"); }
  };

  const toggleResultsPublished = async (examId) => {
    const newState = !resultsPublished[examId];
    try {
      const res = await fetch(`${API_BASE}/api/exams/${examId}/toggle-results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultsPublished: newState }),
      });
      if (res.ok) {
        setResultsPublished(prev => ({ ...prev, [examId]: newState }));
        showToast(newState ? "تم عرض النتائج للطلاب" : "تم إخفاء النتائج عن الطلاب", "success");
      }
    } catch (e) { console.error(e); showToast("حدث خطأ", "error"); }
  };

  const openQuestionManager = (exam) => setManagingExam(exam);
  const openResults = (exam) => setShowResults(exam);

  const handleSendWhatsApp = async (examId) => {
    if (!window.confirm("سيتم إرسال نتائج جميع الطلاب عبر واتساب. هل أنت متأكد؟")) return;
    setSendingWhatsApp(examId);
    try {
      const res = await fetch(`${API_BASE}/api/exams/${examId}/send-results-whatsapp`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setWhatsAppSent(prev => {
          const updated = { ...prev, [examId]: true };
          localStorage.setItem('whatsAppSent', JSON.stringify(updated));
          return updated;
        });
      } else {
        showToast(data.message || "فشل في الإرسال", "error");
      }
    } catch {
      showToast("حدث خطأ أثناء الإرسال", "error");
    }
    finally { setSendingWhatsApp(null); }
  };

  const groupedByYear = useMemo(() => {
    const groups = {};
    exams.forEach(e => {
      if (!groups[e.academicYear]) groups[e.academicYear] = [];
      groups[e.academicYear].push(e);
    });
    return groups;
  }, [exams]);

  const totalByYear = useMemo(() => {
    const t = {};
    exams.forEach(e => { t[e.academicYear] = (t[e.academicYear] || 0) + 1; });
    return t;
  }, [exams]);

  const upcomingExams = exams.filter(e => getExamStatus(e.date, e.startTime, e.durationMins).text === "قادم");
  const activeExams = exams.filter(e => getExamStatus(e.date, e.startTime, e.durationMins).text === "جاري الآن");
  const totalSubmissions = exams.reduce((sum, e) => sum + (e.submissionCount || 0), 0);

  const toggleYear = (year) => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));

  if (managingExam) {
    return (
      <div className="space-y-6">
        <Toast show={toast.show} message={toast.message} type={toast.type} />
        <QuestionManager exam={managingExam} onBack={() => setManagingExam(null)} showToast={showToast} />
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="space-y-6">
        <Toast show={toast.show} message={toast.message} type={toast.type} />
        <ExamResults exam={showResults} onBack={() => setShowResults(null)} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">الامتحانات</h1>
          <p className="mt-1 text-sm text-slate-500">جدولة الامتحانات، إدارة الأسئلة، ومتابعة النتائج</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          امتحان جديد
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-slate-400 font-medium">إجمالي الامتحانات</p><p className="text-2xl font-bold mt-1">{exams.length}</p></div>
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-white/80 font-medium">جاري الآن</p><p className="text-2xl font-bold mt-1">{activeExams.length}</p></div>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-white/80 font-medium">قادم</p><p className="text-2xl font-bold mt-1">{upcomingExams.length}</p></div>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-white/80 font-medium">التسليمات</p><p className="text-2xl font-bold mt-1">{totalSubmissions}</p></div>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add Exam Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div><h3 className="font-bold text-slate-800">جدولة امتحان جديد</h3><p className="text-xs text-slate-500 mt-0.5">اختر الصف والمجموعات ثم حدد وقت الامتحان</p></div>
            </div>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleAddExam} className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">اسم الامتحان</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: امتحان الشهر الأول" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">الصف الدراسي</label>
                <select required value={formGrade} onChange={e => setFormGrade(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white transition focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  {GRADES.map(g => <option key={g} value={g}>{gradeShort(g)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">تاريخ الامتحان</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">المجموعات</label>
              <div className="relative" data-groups-dropdown>
                <div onClick={() => setShowGroupsDropdown(!showGroupsDropdown)} className="min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-white cursor-pointer transition focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
                  {selectedGroups.length === 0 ? (
                    <span className="text-sm text-slate-400">اختر مجموعة أو أكثر...</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedGroups.map(id => {
                        const group = filteredGroups.find(g => g._id === id);
                        return group ? (
                          <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {group.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showGroupsDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {showGroupsDropdown && (
                  <div className="absolute z-20 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">المجموعات المتاحة ({filteredGroups.length})</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={selectAllGroups} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition">تحديد الكل</button>
                        <span className="text-slate-300">|</span>
                        <button type="button" onClick={clearAllGroups} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition">إلغاء</button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {!formGrade ? (
                        <div className="text-center py-4 text-slate-400 text-xs">
                          <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                          اختر الصف أولاً
                        </div>
                      ) : filteredGroups.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-xs">لا توجد مجموعات متاحة</div>
                      ) : (
                        filteredGroups.map(g => {
                          const isChecked = selectedGroups.includes(g._id);
                          return (
                            <button key={g._id} type="button" onClick={() => toggleGroup(g._id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isChecked ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50 border border-transparent"}`}>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${isChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                                {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              </div>
                              <span className={`text-sm font-medium ${isChecked ? "text-indigo-700" : "text-slate-700"}`}>{g.name}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">وقت البدء</label>
                <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">المدة (دقائق)</label>
                <input type="number" min="1" required value={durationMins} onChange={e => setDurationMins(e.target.value)} placeholder="60" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="submit" disabled={submitting} className="flex-1 sm:flex-none sm:px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>جاري الحفظ...</span>
                ) : "جدولة الامتحان"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Exams by Year */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse"><div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-200 rounded w-1/2" /></div>)}
        </div>
      ) : Object.keys(groupedByYear).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد امتحانات بعد</h3>
          <p className="text-sm text-slate-500 mb-4">ابدأ بجدولة أول امتحان</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            امتحان جديد
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {GRADES.filter(y => groupedByYear[y]).map(year => {
            const yearExams = groupedByYear[year];
            const colors = GRADE_COLORS[year];
            const isExpanded = expandedYears[year] === true;

            return (
              <div key={year} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Year Header */}
                <div className={`flex items-center justify-between p-4 ${colors.light} border-b border-slate-100`}>
                  <button onClick={() => toggleYear(year)} className="flex items-center gap-3 flex-1 text-right">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
                      {gradeShort(year).slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{gradeShort(year)}</h3>
                      <p className="text-xs text-slate-500">{yearExams.length} امتحانات</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setFormGrade(year); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      امتحان جديد
                    </button>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-slate-50">
                    {yearExams.sort((a, b) => new Date(b.date) - new Date(a.date)).map(exam => {
                      const status = getExamStatus(exam.date, exam.startTime, exam.durationMins);
                      return (
                        <div key={exam._id} className="p-4 hover:bg-slate-50/50 transition group">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-semibold text-slate-800">{exam.title}</h4>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>{status.text}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                  <span className="font-medium text-slate-600">{exam.group?.name || "مجموعة محذوفة"}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  <span>{formatDate(exam.date)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  <span>{exam.startTime} · {exam.durationMins} دقيقة</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-100 transition flex-shrink-0">
                              <button onClick={() => openQuestionManager(exam)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">الأسئلة</button>
                              <button onClick={() => openResults(exam)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition">النتائج</button>
                              <button onClick={() => toggleResultsPublished(exam._id)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${resultsPublished[exam._id] ? "text-emerald-700 bg-emerald-100" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}>
                                {resultsPublished[exam._id] ? "تم عرض النتائج" : "عرض النتائج للطلاب"}
                              </button>
                              <button onClick={() => handleSendWhatsApp(exam._id)} disabled={sendingWhatsApp === exam._id || whatsAppSent[exam._id]} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${whatsAppSent[exam._id] ? "text-emerald-700 bg-emerald-100 cursor-default" : "text-violet-700 bg-violet-50 hover:bg-violet-100"} disabled:opacity-60`}>
                                {sendingWhatsApp === exam._id ? "جاري الإرسال..." : whatsAppSent[exam._id] ? (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    تم ارسال النتيجه
                                  </span>
                                ) : "إرسال النتيجه للأب"}
                              </button>
                              <button onClick={() => handleDeleteExam(exam._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

