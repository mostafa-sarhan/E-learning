import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const ACADEMIC_YEARS = ["الصف الاول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس"];

function StudentAccounts() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsRes, groupsRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/students/accounts`),
        fetch(`${API_BASE}/api/groups`),
      ]);
      if (accountsRes.ok) setStudents(await accountsRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = students.filter(s => {
    const matchSearch =
      searchTerm === "" ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);
    const matchYear = selectedYear === "" || s.academicYear === selectedYear;
    const matchGroup = selectedGroup === "" || s.group === selectedGroup;
    return matchSearch && matchYear && matchGroup;
  });

  const availableYears = [...new Set(students.map(s => s.academicYear))];
  const availableGroups = selectedYear
    ? [...new Set(students.filter(s => s.academicYear === selectedYear).map(s => s.group))]
    : [...new Set(students.map(s => s.group))];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">حسابات الطلاب</h1>
          <p className="mt-1 text-sm text-slate-600">عرض بيانات الدخول المولدة للطلاب (البريد الإلكتروني وكلمة المرور)</p>
        </div>
        <div className="text-sm text-slate-500">
          إجمالي: <span className="font-bold text-indigo-600">{filtered.length}</span> طالب
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-[2] min-w-[240px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">بحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">الصف الدراسي</label>
            <select
              value={selectedYear}
              onChange={e => { setSelectedYear(e.target.value); setSelectedGroup(""); }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            >
              <option value="">جميع الصفوف</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">المجموعة</label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            >
              <option value="">جميع المجموعات</option>
              {availableGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          {(searchTerm || selectedYear || selectedGroup) && (
            <div className="flex items-end">
              <button
                onClick={() => { setSearchTerm(""); setSelectedYear(""); setSelectedGroup(""); }}
                className="px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                إعادة تعيين
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-lg font-bold text-slate-800">بيانات تسجيل الدخول</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {students.length === 0 ? "لا توجد حسابات طلاب بعد. أضف طالباً من صفحة الطلاب" : "لا توجد نتائج مطابقة"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold text-slate-600">الطالب</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">الصف</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">المجموعة</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">البريد الإلكتروني</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">كلمة المرور</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">{s.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5" dir="ltr">{s.phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{s.academicYear}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{s.group}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded" dir="ltr">{s.email}</span>
                        <button
                          onClick={() => handleCopy(s.email, `email-${s._id}`)}
                          className="text-slate-400 hover:text-indigo-600 transition"
                          title="نسخ"
                        >
                          {copiedId === `email-${s._id}` ? (
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded" dir="ltr">{s.plainPassword}</span>
                        <button
                          onClick={() => handleCopy(s.plainPassword, `pass-${s._id}`)}
                          className="text-slate-400 hover:text-indigo-600 transition"
                          title="نسخ"
                        >
                          {copiedId === `pass-${s._id}` ? (
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentAccounts;
