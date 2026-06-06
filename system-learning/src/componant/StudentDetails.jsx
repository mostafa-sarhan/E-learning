import React, { useState, useEffect, useCallback } from "react";
import { getRateForYear } from "../utils/rates";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function formatBirthday(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-EG");
}

function formatDate(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
}

function StudentDetails({ student, onBack }) {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState("");
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const [paymentMonth, setPaymentMonth] = useState(months[new Date().getMonth()]);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    const rate = getRateForYear(student.academicYear);
    if (rate > 0) setPaymentAmount(String(rate));
  }, [student.academicYear]);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [attRes, payRes] = await Promise.all([
        fetch(`${API_BASE}/api/attendance/student/${student._id}`),
        fetch(`${API_BASE}/api/payments/student/${student._id}`)
      ]);
      
      if (attRes.ok) setAttendanceHistory(await attRes.json());
      if (payRes.ok) setPayments(await payRes.json());
    } catch (e) {
      console.error("Failed to fetch student details:", e);
    } finally {
      setLoadingData(false);
    }
  }, [student._id]);

  const now = new Date();
  const currentMonth = months[now.getMonth()];
  const lastMonth = months[(now.getMonth() + 11) % 12];

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || !paymentMonth) return;
    setSavingPayment(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student._id,
          amount: paymentAmount,
          month: paymentMonth,
        }),
      });
      if (res.ok) {
        setPaymentAmount("");
        setPaymentMonth(months[new Date().getMonth()]); // Reset to current month
        fetchData();
      } else {
        alert("فشل في إضافة الاشتراك");
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!window.confirm("حذف هذا الطالب نهائياً؟ ستفقد جميع بياناته.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/students/${student._id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        onBack();
      } else {
        alert("فشل الحذف");
      }
    } catch (e) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm("حذف هذا الدفع؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/payments/${id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <header className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{student.name}</h1>
          <p className="text-sm text-slate-500">تفاصيل الطالب وسجل الحضور والاشتراكات</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">المعلومات الشخصية</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">الهاتف</span>
                <span className="font-medium text-slate-900" dir="ltr">{student.phone}</span>
              </li>
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">هاتف الأب</span>
                <span className="font-medium text-slate-900" dir="ltr">{student.fatherPhone}</span>
              </li>
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">تاريخ الميلاد</span>
                <span className="font-medium text-slate-900">{formatBirthday(student.birthday)}</span>
              </li>
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">تاريخ الانضمام</span>
                <span className="font-medium text-slate-900">{formatDate(student.createdAt)}</span>
              </li>
              <li className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">الصف الدراسي</span>
                <span className="font-medium text-slate-900">{student.academicYear}</span>
              </li>
              <li className="flex justify-between pb-2">
                <span className="text-slate-500">المجموعة</span>
                <span className="font-medium text-slate-900">{student.group ? student.group.name : "غير محدد"}</span>
              </li>
            </ul>
          </div>

          {/* Subscription Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>الاشتراك</span>
              {getRateForYear(student.academicYear) > 0 && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{getRateForYear(student.academicYear)} ج.م/شهر</span>
              )}
            </h3>
            <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
              {months.slice(0, now.getMonth() + 1).map(m => {
                const isPaid = payments.some(p => p.month === m);
                return (
                  <li key={m} className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-500">{m}</span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                        مدفوع
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                        غير مدفوع
                      </span>
                    )}
                  </li>
                );
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-2xl border border-red-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-red-800 mb-2">منطقة الخطر</h3>
            <p className="text-xs text-red-600 mb-4">حذف هذا الطالب سيؤدي إلى مسحه من النظام.</p>
            <button
              onClick={handleDeleteStudent}
              className="w-full bg-white text-red-600 border border-red-200 font-semibold text-sm py-2 rounded-xl hover:bg-red-600 hover:text-white transition"
            >
              حذف الطالب نهائياً
            </button>
          </div>
        </div>

        {/* Tables Section */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Payments */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">سجل دفع الاشتراكات</h3>
            </div>
            
            <form onSubmit={handleAddPayment} className="p-4 border-b border-slate-100 bg-emerald-50/30 grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">المبلغ</label>
                <input 
                  type="number" 
                  min="0"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="مثال: 150"
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">عن شهر</label>
                <select 
                  value={paymentMonth}
                  onChange={e => setPaymentMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">— اختر الشهر —</option>
                  {months.slice(0, now.getMonth() + 1).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                disabled={savingPayment || !paymentAmount || !paymentMonth}
                className="bg-emerald-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {savingPayment ? "..." : "+ إضافة دفع"}
              </button>
            </form>

            <div className="p-0">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 font-semibold text-slate-600">الشهر</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">المبلغ</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">تاريخ الدفع</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 w-16">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr><td colSpan="4" className="text-center py-4 text-slate-400">جاري التحميل...</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4 text-slate-400">لا يوجد سجل مدفوعات</td></tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-800">{p.month}</td>
                        <td className="px-5 py-3 font-semibold text-emerald-600">{p.amount} ج.م</td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(p.date)}</td>
                        <td className="px-5 py-3">
                           <button onClick={() => handleDeletePayment(p._id)} className="text-xs text-red-500 hover:text-red-700">حذف</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">سجل الحضور والغياب</h3>
            </div>
            <div className="p-0 max-h-80 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <th className="px-5 py-3 font-semibold text-slate-600">التاريخ</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">وقت التسجيل</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr><td colSpan="3" className="text-center py-4 text-slate-400">جاري التحميل...</td></tr>
                  ) : attendanceHistory.length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-4 text-slate-400">لم يتم تسجيل حضور حتى الآن</td></tr>
                  ) : (
                    attendanceHistory.map((att, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-medium text-slate-700">{formatDate(att.date)}</td>
                        <td className="px-5 py-3 text-slate-500">{formatTime(att.time)}</td>
                        <td className="px-5 py-3">
                          {att.status === "present" ? (
                            <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">حاضر</span>
                          ) : att.status === "absent" ? (
                            <span className="inline-flex rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">غائب</span>
                          ) : (
                            <span className="text-slate-400">غير محدد</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default StudentDetails;
