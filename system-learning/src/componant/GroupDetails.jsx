import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function GroupDetails({ group, onBack }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/students/${group._id}`);
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch students for group:", e);
    } finally {
      setLoading(false);
    }
  }, [group._id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDeleteGroup = async () => {
    if (!window.confirm("حذف هذه المجموعة نهائياً؟ سيتم حذف المجموعة فقط ولن يتم حذف طلابها.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups/${group._id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        onBack();
      } else {
        alert("فشل الحذف");
      }
    } catch (e) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleCopyAllEmails = () => {
    const text = students
      .map((s) => s.name + " - " + (s.phone || "لا يوجد هاتف"))
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("تم نسخ بيانات الطلاب");
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm)
  );

  const dayIcons = {
    السبت: "🟤",
    الأحد: "🟡",
    الإثنين: "🟢",
    الثلاثاء: "🔵",
    الأربعاء: "🟣",
    الخميس: "🟠",
    الجمعة: "⚪",
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{group.academicYear}</p>
          </div>
        </div>
        <button
          onClick={handleDeleteGroup}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          حذف المجموعة
        </button>
      </header>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-slate-500">الموعد</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{group.time || "—"}</p>
        </div>

        {/* Students Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-slate-500">عدد الطلاب</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{students.length} طالب</p>
        </div>

        {/* Days Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-slate-500">أيام الحضور</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(typeof group.days === "string"
              ? group.days
                  .split(",")
                  .map((d) => d.trim())
                  .filter(Boolean)
              : group.days || []
            ).map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">
            قائمة الطلاب
            <span className="mr-2 text-sm font-normal text-slate-500">({filtered.length})</span>
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white w-full sm:w-64"
            />
            {students.length > 0 && (
              <button
                onClick={handleCopyAllEmails}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex-shrink-0"
              >
                نسخ البيانات
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">
              {students.length === 0
                ? "لا يوجد طلاب مسجلين في هذه المجموعة"
                : "لا توجد نتائج مطابقة"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s, i) => (
              <div
                key={s._id}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-indigo-200/50">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono" dir="ltr">{s.phone}</p>
                  {s.fatherPhone && (
                    <p className="text-xs text-slate-400 font-mono" dir="ltr">ولي: {s.fatherPhone}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-400 flex-shrink-0">{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupDetails;
