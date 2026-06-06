import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import StudentDetails from "./StudentDetails";
import { getRateForYear } from "../utils/rates";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function Attendance() {
  const [groups, setGroups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [savedAttendance, setSavedAttendance] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [toast, setToast] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payMonth, setPayMonth] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const autoSaveTimer = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/groups`).then(res => res.json()),
      fetch(`${API_BASE}/api/payments`).then(res => res.json())
    ]).then(([groupsData, paymentsData]) => {
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    }).catch(err => console.error("Failed to fetch initial data:", err));
  }, []);

  const availableTerms = useMemo(() => {
    const terms = new Set(groups.map(g => g.academicYear).filter(Boolean));
    return Array.from(terms);
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(g => g.academicYear === searchTerm);
  }, [groups, searchTerm]);

  useEffect(() => { setSelectedGroup(""); }, [searchTerm]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments`);
      if (res.ok) setPayments(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const handleQuickPay = async () => {
    if (!payModal || !payMonth || !payAmount) {
      showToast("يرجى اختيار الشهر وإدخال المبلغ", "error");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: payModal._id, amount: Number(payAmount), month: payMonth }),
      });
      if (res.ok) {
        showToast(`تم تسجيل دفع ${payAmount} ج.م لشهر ${payMonth}`, "success");
        setPayModal(null);
        setPayMonth("");
        setPayAmount("");
        await refreshPayments();
      } else {
        showToast("فشل في تسجيل الدفع", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء تسجيل الدفع", "error");
    }
  };

  const loadData = useCallback(async () => {
    if (!selectedGroup || !selectedDate) { setStudents([]); setAttendance({}); setSavedAttendance({}); setSaveStatus("saved"); return; }
    setLoading(true); setError(null); setSaveStatus("saved");
    try {
      const resStudents = await fetch(`${API_BASE}/api/attendance/students/${selectedGroup}`);
      if (!resStudents.ok) throw new Error("فشل تحميل الطلاب");
      const studentsData = await resStudents.json();
      setStudents(studentsData);

      const resAtt = await fetch(`${API_BASE}/api/attendance?groupId=${selectedGroup}&date=${selectedDate}`);
      if (!resAtt.ok) throw new Error("فشل تحميل سجل الغياب");
      const attData = await resAtt.json();
      const attMap = {};
      if (attData && attData.records) {
        attData.records.forEach(r => { attMap[r.student._id || r.student] = r.status; });
      }
      studentsData.forEach(s => { if (!attMap[s._id]) attMap[s._id] = "absent"; });
      setAttendance(attMap);
      setSavedAttendance(JSON.parse(JSON.stringify(attMap)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ أثناء تحميل البيانات");
    } finally { setLoading(false); }
  }, [selectedGroup, selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    setSaveStatus("unsaved");
  };

  const saveAll = async () => {
    if (students.length === 0) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      await Promise.all(
        students.map(s =>
          fetch(`${API_BASE}/api/attendance/mark`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: selectedGroup, date: selectedDate, studentId: s._id, status: attendance[s._id] || "absent" }),
          })
        )
      );
      setSavedAttendance(JSON.parse(JSON.stringify(attendance)));
      setSaveStatus("saved");
      showToast(`تم حفظ الحضور لـ ${students.length} طالب بنجاح`, "success");
    } catch (e) {
      setSaveStatus("unsaved");
      showToast("فشل في حفظ الحضور", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    saveAll();
  };

  const handleSendWhatsApp = async () => {
    if (students.length === 0) return;
    setSendingWhatsApp(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroup, date: selectedDate }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
      } else {
        showToast(data.message || "فشل في إرسال الرسائل", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الإرسال", "error");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    if (saveStatus !== "unsaved" || students.length === 0 || saving) return;
    saveAll();
  }, [attendance]);

  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const currentMonthName = months[new Date().getMonth()];

  const fetchStudentsList = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`${API_BASE}/api/attendance/students/${selectedGroup}`);
      if (res.ok) setStudents(await res.json());
    } catch (e) { console.error(e); }
  }, [selectedGroup]);

  if (selectedStudent) {
    return <StudentDetails student={selectedStudent} onBack={() => { setSelectedStudent(null); fetchStudentsList(); }} />;
  }

  const filtered = students.filter(s => filterStatus === "all" || (attendance[s._id] || "absent") === filterStatus);
  const presentCount = students.filter(s => attendance[s._id] === "present").length;
  const absentCount = students.filter(s => attendance[s._id] === "absent").length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      <header>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">الحضور والغياب</h1>
          <p className="mt-1 text-sm text-slate-600">حدد المجموعة والتاريخ لتسجيل الحضور</p>
        </div>
      </header>

      {/* Controls */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">الصف الدراسي</label>
            <select value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
              <option value="">كل الصفوف</option>
              {availableTerms.map(term => (<option key={term} value={term}>{term}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">المجموعة</label>
            <select value={selectedGroup} disabled={!searchTerm && availableTerms.length > 0} onChange={e => setSelectedGroup(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 disabled:opacity-50">
              <option value="">اختر المجموعة</option>
              {filteredGroups.map(g => (<option key={g._id} value={g._id}>{g.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">التاريخ</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">فلترة بالحالة</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
              <option value="all">عرض الكل</option>
              <option value="present">حاضر فقط</option>
              <option value="absent">غائب فقط</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSaveAll}
              disabled={saving || students.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  حفظ 
                </>
              )}
            </button>
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp || students.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingWhatsApp ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  إرسال
                </>
              )}
            </button>
            {students.length > 0 && saveStatus !== "saved" && (
              <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium ${
                saveStatus === "saving" ? "bg-amber-50 text-amber-700" :
                "bg-blue-50 text-blue-700"
              }`}>
              {saveStatus === "saving" && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              {saveStatus === "unsaved" && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {saveStatus === "saving" ? "..." : saveStatus === "unsaved" ? "لم يحفظ" : null}
              </span>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {/* Stats */}
      {students.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-xs text-slate-500">إجمالي</p>
            <p className="text-xl font-bold text-slate-900">{students.length}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center shadow-sm">
            <p className="text-xs text-emerald-600">حاضر</p>
            <p className="text-xl font-bold text-emerald-700">{presentCount}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center shadow-sm">
            <p className="text-xs text-red-600">غائب</p>
            <p className="text-xl font-bold text-red-700">{absentCount}</p>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : !selectedGroup ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">اختر مجموعة لعرض الطلاب</div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">لا يوجد طلاب في هذه المجموعة</div>
        ) : (
          filtered.map(s => {
            const status = attendance[s._id] || "absent";
            const hasPaid = payments.some(p => (p.student?._id === s._id || p.student === s._id) && p.month === currentMonthName);
            return (
              <div key={s._id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${status === "present" ? "bg-emerald-500" : "bg-red-400"}`}>
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 font-mono" dir="ltr">{s.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPaid && <span className="h-2 w-2 rounded-full bg-emerald-500" title="دفع" />}
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button onClick={() => handleStatusChange(s._id, "present")} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${status === "present" ? "bg-emerald-100 text-emerald-800" : "text-slate-400"}`}>حاضر</button>
                      <button onClick={() => handleStatusChange(s._id, "absent")} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${status === "absent" ? "bg-red-100 text-red-800" : "text-slate-400"}`}>غائب</button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => { setPayModal(s); setPayMonth(currentMonthName); setPayAmount(getRateForYear(s.academicYear) || ""); }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm-6-3a1 1 0 100 2 1 1 0 000-2z" />
                    </svg>
                    دفع سريع
                  </button>
                  <button onClick={() => setSelectedStudent(s)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    التفاصيل
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري التحميل...</div>
        ) : !selectedGroup ? (
          <div className="p-12 text-center text-slate-400">اختر مجموعة لعرض الطلاب</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">لا يوجد طلاب في هذه المجموعة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 font-semibold text-slate-700">الطالب</th>
                  <th className="px-5 py-3 font-semibold text-slate-700">الهاتف</th>
                  <th className="px-5 py-3 font-semibold text-slate-700">الدفع</th>
                  <th className="px-5 py-3 font-semibold text-slate-700 text-center">الحالة</th>
                  <th className="px-5 py-3 font-semibold text-slate-700 w-20">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => {
                  const status = attendance[s._id] || "absent";
                  const hasPaid = payments.some(p => (p.student?._id === s._id || p.student === s._id) && p.month === currentMonthName);
                  return (
                    <tr key={s._id} className="transition hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${status === "present" ? "bg-emerald-500" : "bg-red-400"}`}>
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs" dir="ltr">{s.phone}</td>
                      <td className="px-5 py-3">
                        {hasPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>{currentMonthName}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"><span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>لم يدفع</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                          <button onClick={() => handleStatusChange(s._id, "present")} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${status === "present" ? "bg-emerald-100 text-emerald-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>حاضر</button>
                          <button onClick={() => handleStatusChange(s._id, "absent")} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${status === "absent" ? "bg-red-100 text-red-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>غائب</button>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setPayModal(s); setPayMonth(currentMonthName); setPayAmount(getRateForYear(s.academicYear) || ""); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm-6-3a1 1 0 100 2 1 1 0 000-2z" />
                            </svg>
                            دفع
                          </button>
                          {/* <button onClick={() => setSelectedStudent(s)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">التفاصيل</button> */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setPayModal(null); setPayMonth(""); setPayAmount(""); }}></div>
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
                    {payModal.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{payModal.name}</h3>
                    <p className="text-xs text-white/80">{payModal.academicYear || "بدون صف"} • تسجيل دفعة جديدة</p>
                  </div>
                </div>
                <button onClick={() => { setPayModal(null); setPayMonth(""); setPayAmount(""); }} className="p-1.5 rounded-lg hover:bg-white/20 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">الشهر</label>
                <select value={payMonth} onChange={e => setPayMonth(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50">
                  {months.map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">المبلغ (ج.م)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="أدخل المبلغ" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50" />
                {getRateForYear(payModal?.academicYear) > 0 && (
                  <p className="mt-1 text-xs text-violet-600 font-medium">الرسوم المحددة للصف: {getRateForYear(payModal.academicYear)} ج.م</p>
                )}
              </div>

              <button
                onClick={handleQuickPay}
                disabled={!payMonth || !payAmount}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                تأكيد الدفع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
