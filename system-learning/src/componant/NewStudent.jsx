import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const ACADEMIC_GRADE_OPTIONS = [
  "الصف الاول",
  "الصف الثانى",
  "الصف الثالث",
];

const emptyForm = {
  name: "",
  phone: "",
  fatherPhone: "",
  academicYear: "",
  group: "",
  birthday: "",
  status: "active",
};

function NewStudent({ onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState([]);
  const [createdAccount, setCreatedAccount] = useState(null);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/groups`)
      .then(res => res.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone" || name === "fatherPhone") {
      const englishNumbers = value.replace(/[^0-9]/g, "");
      setForm(prev => ({ ...prev, [name]: englishNumbers }));
    } else {
      setForm(prev => name === "academicYear" ? { ...prev, [name]: value, group: "" } : { ...prev, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedAccount(null);

    if (!form.name.trim() || !form.phone.trim() || !form.fatherPhone.trim() || !form.academicYear || !form.birthday) {
      setError("يرجى تعبئة جميع الحقول المطلوبة.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          fatherPhone: form.fatherPhone.trim(),
          academicYear: form.academicYear,
          group: form.group || undefined,
          birthday: form.birthday,
          status: form.status,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "فشل إضافة الطالب");

      try {
        const accountRes = await fetch(`${API_BASE}/api/auth/students/account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: data._id, name: form.name.trim() }),
        });
        if (accountRes.ok) setCreatedAccount(await accountRes.json());
      } catch (e) {
        console.error("Failed to create student account:", e);
      }

      setForm(emptyForm);
      onSuccess && onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">إضافة طالب جديد</h1>
        <p className="mt-1 text-sm text-slate-600">أدخل بيانات الطالب لتسجيله في النظام</p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {createdAccount && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-emerald-800">تم إنشاء حساب الطالب بنجاح</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-600 mb-0.5">البريد الإلكتروني</p>
                  <p className="font-mono text-emerald-900 font-semibold" dir="ltr">{createdAccount.email}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-emerald-600 mb-0.5">كلمة المرور</p>
                  <p className="font-mono text-emerald-900 font-semibold" dir="ltr">{createdAccount.password}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-700 mt-2">احفظ هذه البيانات لإعطائها للطالب</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">اسم الطالب</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="الاسم الكامل" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">رقم الهاتف</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="01xxxxxxxxx" required dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">هاتف الأب</label>
            <input name="fatherPhone" value={form.fatherPhone} onChange={handleChange} placeholder="01xxxxxxxxx" required dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">الصف الدراسي</label>
            <select name="academicYear" value={form.academicYear} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
              <option value="">اختر الصف</option>
              {ACADEMIC_GRADE_OPTIONS.map(g => (<option key={g} value={g}>{g}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">المجموعة (اختياري)</label>
            <select name="group" value={form.group} onChange={handleChange} disabled={!form.academicYear} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 disabled:opacity-50">
              <option value="">اختر المجموعة</option>
              {groups.filter(g => g.academicYear === form.academicYear).map(g => (<option key={g._id} value={g._id}>{g.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">تاريخ الميلاد</label>
            <input type="date" name="birthday" value={form.birthday} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">الحالة</label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {submitting ? "جاري الحفظ..." : "إضافة الطالب"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default NewStudent;
