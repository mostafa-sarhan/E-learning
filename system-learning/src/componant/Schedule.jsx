import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const DAYS_AR = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => i + 8);

function formatTime12(time24) {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "م" : "ص";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formDay, setFormDay] = useState(0);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formGroup, setFormGroup] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, grpRes] = await Promise.all([
        fetch(`${API_BASE}/api/sessions`),
        fetch(`${API_BASE}/api/groups`)
      ]);
      if (sessRes.ok) setSessions(await sessRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormDay(0); setFormStartTime("09:00"); setFormEndTime("10:00");
    setFormGroup(""); setFormSubject(""); setEditId(null); setShowForm(false);
  };

  const openAdd = (day) => {
    if (day !== undefined) setFormDay(day);
    setEditId(null); setShowForm(true);
  };

  const openEdit = (s) => {
    setFormDay(s.dayIndex ?? 0);
    setFormStartTime(s.startTime ?? "09:00");
    setFormEndTime(s.endTime ?? "10:00");
    setFormGroup(s.group?._id ?? "");
    setFormSubject(s.subject ?? "");
    setEditId(s._id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formGroup || !formSubject) { alert("الرجاء تعبئة جميع الحقول"); return; }
    setSubmitting(true);
    try {
      const body = { dayIndex: formDay, startTime: formStartTime, endTime: formEndTime, groupId: formGroup, subject: formSubject };
      const url = editId ? `${API_BASE}/api/sessions/${editId}` : `${API_BASE}/api/sessions`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { resetForm(); fetchData(); }
      else { const d = await res.json(); alert(d.message || "فشل في الحفظ"); }
    } catch (e) { alert("حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("حذف هذه الحصة؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) fetchData();
    } catch (e) { console.error(e); }
  };

  const groupById = (id) => groups.find(g => g._id === id);

  const sessionsByDay = (dayIndex) =>
    sessions
      .filter(s => (s.dayIndex ?? 0) === dayIndex)
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const dayNameForDate = (dayIndex) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const map = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };
    const targetDiff = dayIndex - (map[dayOfWeek] ?? 0);
    const d = new Date(today);
    d.setDate(today.getDate() + targetDiff);
    return d.getDate() + "/" + (d.getMonth() + 1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">الجدول الدراسي</h1>
          <p className="mt-1 text-sm text-slate-600">عرض وإدارة مواعيد الحصص الأسبوعية</p>
        </div>
        <button onClick={() => openAdd()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          حصة جديدة
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">{editId ? "تعديل الحصة" : "إضافة حصة جديدة"}</h3>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">اليوم</label>
              <select value={formDay} onChange={e => setFormDay(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
                {DAYS_AR.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">من</label>
              <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} required dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">إلى</label>
              <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} required dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">المجموعة</label>
              <select value={formGroup} onChange={e => setFormGroup(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
                <option value="">اختر</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">المادة</label>
              <input type="text" value={formSubject} onChange={e => setFormSubject(e.target.value)} required placeholder="رياضيات" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60">{submitting ? "..." : "حفظ"}</button>
              <button type="button" onClick={resetForm} className="px-4 py-3 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">إلغاء</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400">جاري التحميل...</div>
      ) : (
        <>
          {/* Desktop Weekly Grid */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/80">
              <div className="px-4 py-3 text-xs font-semibold text-slate-500 border-l border-slate-100">الوقت</div>
              {DAYS_AR.map((day, i) => (
                <div key={i} className="px-2 py-3 text-center">
                  <div className="text-sm font-bold text-slate-800">{day}</div>
                  <div className="text-xs text-slate-400">{dayNameForDate(i)}</div>
                </div>
              ))}
            </div>
            {TIME_SLOTS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-slate-50 last:border-b-0">
                <div className="px-4 py-4 text-xs text-slate-400 border-l border-slate-100 font-mono">
                  {formatTime12(`${hour}:00`)}
                </div>
                {DAYS_AR.map((_, dayI) => {
                  const daySessions = sessionsByDay(dayI).filter(s => {
                    const sH = parseInt(s.startTime?.split(":")[0] || "0");
                    return sH === hour;
                  });
                  return (
                    <div key={dayI} className="px-2 py-1 min-h-[56px] relative group/cell">
                      <button onClick={() => openAdd(dayI)} className="absolute inset-0 w-full h-full opacity-0 group-hover/cell:opacity-100 bg-indigo-50/50 rounded-lg flex items-center justify-center transition">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      </button>
                      {daySessions.map(s => {
                        const grp = s.group ? (typeof s.group === "string" ? groupById(s.group) : s.group) : null;
                        return (
                          <div key={s._id} className="relative rounded-xl p-2.5 mb-1 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 hover:border-indigo-300 transition cursor-default">
                            <div className="text-xs font-bold text-indigo-700 truncate">{s.subject}</div>
                            <div className="text-xs text-slate-500 truncate">{grp?.name ?? ""}</div>
                            <div className="absolute top-1 left-1 hidden group-hover:flex gap-1">
                              <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="w-5 h-5 rounded bg-white/80 flex items-center justify-center text-slate-400 hover:text-indigo-600">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(s._id); }} className="w-5 h-5 rounded bg-white/80 flex items-center justify-center text-slate-400 hover:text-red-600">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mobile Day Cards */}
          <div className="md:hidden space-y-3">
            {DAYS_AR.map((day, dayI) => {
              const daySessions = sessionsByDay(dayI);
              return (
                <div key={dayI} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <button onClick={() => setSelectedDay(selectedDay === dayI ? null : dayI)} className="w-full flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${daySessions.length > 0 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">{day}</div>
                        <div className="text-xs text-slate-400">{dayNameForDate(dayI)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{daySessions.length} حصص</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${selectedDay === dayI ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>
                  {selectedDay === dayI && (
                    <div className="border-t border-slate-100 p-3 space-y-2">
                      {daySessions.length === 0 ? (
                        <div className="text-center py-4 text-sm text-slate-400">لا توجد حصص</div>
                      ) : (
                        daySessions.map(s => {
                          const grp = s.group ? (typeof s.group === "string" ? groupById(s.group) : s.group) : null;
                          return (
                            <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
                              <div>
                                <div className="font-bold text-sm text-indigo-700">{s.subject}</div>
                                <div className="text-xs text-slate-500">{grp?.name ?? ""}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{formatTime12(s.startTime)} - {formatTime12(s.endTime)}</div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Schedule;
