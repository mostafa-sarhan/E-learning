import React, { useCallback, useEffect, useState, useMemo } from "react";
import StudentDetails from "./StudentDetails";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function Students() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [searchPaymentStatus, setSearchPaymentStatus] = useState("");

  const availableTerms = useMemo(() => {
    const terms = new Set(groups.map(g => g.academicYear).filter(Boolean));
    return Array.from(terms);
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(g => g.academicYear === searchTerm);
  }, [groups, searchTerm]);

  useEffect(() => {
    setSearchGroup("");
  }, [searchTerm]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/groups`);
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error("Failed to fetch groups:", e);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/students`);
      if (!res.ok) throw new Error("Network response was not ok");
      setStudents(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
      setStudents([]);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments`);
      if (res.ok) setPayments(await res.json());
    } catch (e) {
      console.error("Failed to fetch payments:", e);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStudents(), fetchGroups(), fetchPayments()]);
    setLoading(false);
  }, [fetchStudents, fetchGroups, fetchPayments]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const currentMonthName = months[new Date().getMonth()];

  const filteredStudents = students.filter(s => {
    const nameMatch = searchName === "" || s.name?.toLowerCase().includes(searchName.toLowerCase());
    const phoneMatch = searchPhone === "" || s.phone?.includes(searchPhone) || s.fatherPhone?.includes(searchPhone);
    const termMatch = searchTerm === "" || (s.group && s.group.academicYear === searchTerm);
    const groupMatch = searchGroup === "" || (s.group && s.group._id === searchGroup);
    const hasPaid = payments.some(p => (p.student?._id === s._id || p.student === s._id) && p.month === currentMonthName);
    const paymentMatch = searchPaymentStatus === "" || (searchPaymentStatus === "paid" ? hasPaid : !hasPaid);
    return nameMatch && phoneMatch && termMatch && groupMatch && paymentMatch;
  });

  if (selectedStudent) {
    return (
      <StudentDetails
        student={selectedStudent} 
        onBack={() => { setSelectedStudent(null); fetchStudents(); }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">إدارة الطلاب</h1>
          <p className="mt-1 text-sm text-slate-600">عرض وإدارة بيانات الطلاب والبحث عنهم</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200 transition hover:bg-slate-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة
          </button>
          <Link to="/new-student" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            طالب جديد
          </Link>
        </div>
      </header>

      {/* Print Header - hidden on screen, visible in print */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">قائمة الطلاب</h1>
        <div className="text-sm text-slate-600 space-y-1">
          <p>العدد: <span className="font-semibold">{filteredStudents.length}</span> من أصل {students.length} طالب</p>
          {(searchName || searchPhone || searchTerm || searchGroup || searchPaymentStatus) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {searchName && <span>الاسم: "{searchName}"</span>}
              {searchPhone && <span>الهاتف: "{searchPhone}"</span>}
              {searchTerm && <span>الصف الدراسي: "{searchTerm}"</span>}
              {searchGroup && (() => {
                const g = groups.find(g => g._id === searchGroup);
                return <span>المجموعة: "{g?.name || searchGroup}"</span>;
              })()}
              {searchPaymentStatus === "paid" && <span>الحالة: مدفوع ({currentMonthName})</span>}
              {searchPaymentStatus === "unpaid" && <span>الحالة: لم يدفع ({currentMonthName})</span>}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {/* Filters */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">الاسم</label>
            <input type="text" placeholder="بحث بالاسم..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">رقم الهاتف</label>
            <input type="text" placeholder="بحث بالهاتف..." value={searchPhone} onChange={e => setSearchPhone(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">الصف الدراسي</label>
            <select value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
              <option value="">كل الصفوف</option>
              {availableTerms.map(term => (<option key={term} value={term}>{term}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">المجموعة</label>
            <select value={searchGroup} disabled={!searchTerm && availableTerms.length > 0} onChange={e => setSearchGroup(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 disabled:opacity-50">
              <option value="">كل المجموعات</option>
              {filteredGroups.map(g => (<option key={g._id} value={g._id}>{g.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">حاله الشهر الحالي</label>
            <select value={searchPaymentStatus} onChange={e => setSearchPaymentStatus(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
              <option value="">الكل</option>
              <option value="paid">مدفوع ({currentMonthName})</option>
              <option value="unpaid">لم يدفع ({currentMonthName})</option>
            </select>
          </div>
        </div>
      </section>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          عرض <span className="font-semibold text-slate-800">{filteredStudents.length}</span> من أصل <span className="font-semibold text-slate-800">{students.length}</span> طالب
        </p>
        <button onClick={fetchAllData} disabled={loading} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
          {loading ? "جاري التحديث..." : "تحديث"}
        </button>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            {students.length === 0 ? "لا يوجد طلاب بعد." : "لا توجد نتائج مطابقة."}
          </div>
        ) : (
          filteredStudents.map(s => {
            const hasPaid = payments.some(p => (p.student?._id === s._id || p.student === s._id) && p.month === currentMonthName);
            return (
              <div key={s._id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono" dir="ltr">{s.phone}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{s.academicYear || "—"}</span>
                        {s.group && <span className="text-xs text-slate-500">{s.group.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${hasPaid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${hasPaid ? "bg-emerald-600" : "bg-red-600"}`}></span>
                      {hasPaid ? "دفع" : "لم يدفع"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {(() => {
                        const sp = payments.filter(p => p.student?._id === s._id || p.student === s._id);
                        if (sp.length === 0) return "—";
                        return sp.sort((a, b) => new Date(b.date) - new Date(a.date))[0].month;
                      })()}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(s)} className="w-full mt-3 rounded-xl bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition">
                  عرض التفاصيل
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري التحميل...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {students.length === 0 ? "لا يوجد طلاب بعد." : "لا توجد نتائج مطابقة."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-700">الاسم</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">الهاتف</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">الصف</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">المجموعة</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">حاله الشهر الحالي</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-20">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(s => {
                  const hasPaid = payments.some(p => (p.student?._id === s._id || p.student === s._id) && p.month === currentMonthName);
                  return (
                    <tr key={s._id} className="transition hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs" dir="ltr">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3"><span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{s.academicYear ?? "—"}</span></td>
                      <td className="px-4 py-3 text-slate-600">{s.group ? s.group.name : "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {hasPaid ? (
                          <span className="text-emerald-700">🟢 مدفوع ({currentMonthName})</span>
                        ) : (
                          <span className="text-red-700">🔴 لم يدفع ({currentMonthName})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(s)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          التفاصيل
                        </button>
                      </td>
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

import { Link } from "react-router-dom";
export default Students;
