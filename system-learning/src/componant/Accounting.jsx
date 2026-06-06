import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getStoredRates, setStoredRates } from "../utils/rates";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export { getStoredRates, setStoredRates };

function formatDate(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("ar-EG") + " ج.م";
}

function Accounting() {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rates, setRates] = useState(getStoredRates());
  const [showRates, setShowRates] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => {
    const handler = () => setRates(getStoredRates());
    window.addEventListener("rates-changed", handler);
    return () => window.removeEventListener("rates-changed", handler);
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(academicYears);
    payments.forEach(p => {
      if (p.student?.academicYear) years.add(p.student.academicYear);
    });
    return Array.from(years).sort();
  }, [payments, academicYears]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set(payments.map(p => p.month).filter(Boolean));
    const monthsOrder = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return monthsOrder.filter(m => monthsSet.has(m));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (!filterMonth) return payments;
    return payments.filter(p => p.month === filterMonth);
  }, [payments, filterMonth]);

  const filteredIncome = useMemo(() => filteredPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), [filteredPayments]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, expRes, stuRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments`),
        fetch(`${API_BASE}/api/expenses`),
        fetch(`${API_BASE}/api/students`)
      ]);
      if (payRes.ok) setPayments(await payRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
      if (stuRes.ok) {
        const students = await stuRes.json();
        const years = new Set(students.map(s => s.academicYear).filter(Boolean));
        setAcademicYears(Array.from(years));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalIncome = useMemo(() => payments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), [expenses]);
  const netProfit = totalIncome - totalExpenses;
  const displayIncome = filterMonth ? filteredIncome : totalIncome;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: expenseTitle, amount: expenseAmount }),
      });
      if (res.ok) { setExpenseTitle(""); setExpenseAmount(""); setShowForm(false); fetchData(); }
      else alert("فشل في إضافة المصروف");
    } catch (e) { alert("حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("حذف هذا المصروف؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleAddRate = (e) => {
    e.preventDefault();
    if (!rateYear || !rateAmount) return;
    setRates(prev => {
      const next = { ...prev, [rateYear]: Number(rateAmount) };
      setStoredRates(next);
      return next;
    });
    setRateYear("");
    setRateAmount("");
    setEditingRateId(null);
  };

  const handleDeleteRate = (year) => {
    setRates(prev => {
      const next = { ...prev };
      delete next[year];
      setStoredRates(next);
      return next;
    });
  };

  const handleAddNewYear = () => {
    const name = prompt("أدخل اسم الصف الدراسي:");
    if (name && name.trim()) {
      const trimmed = name.trim();
      if (!rates.hasOwnProperty(trimmed)) {
        setRates(prev => {
          const next = { ...prev, [trimmed]: 0 };
          setStoredRates(next);
          return next;
        });
      }
    }
  };

  const startEditRate = (year, amount) => {
    setEditingRateId(year);
    setEditRateAmount(amount);
  };

  const saveEditRate = (year) => {
    if (!editRateAmount) return;
    setRates(prev => {
      const next = { ...prev, [year]: Number(editRateAmount) };
      setStoredRates(next);
      return next;
    });
    setEditingRateId(null);
    setEditRateAmount("");
  };

  const cancelEditRate = () => {
    setEditingRateId(null);
    setEditRateAmount("");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">إدارة الحسابات</h1>
          <p className="mt-1 text-sm text-slate-600">متابعة الإيرادات والمصروفات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRates(!showRates)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            أسعار الاشتراكات
          </button>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            مصروف جديد
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">إجمالي الإيرادات{filterMonth ? ` - ${filterMonth}` : ""}</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(displayIncome)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">إجمالي المصروفات</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${netProfit >= 0 ? 'bg-gradient-to-br from-emerald-600 to-green-700 text-white' : 'bg-gradient-to-br from-red-600 to-rose-700 text-white'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs opacity-90">صافي الربح</p>
              <p className="text-xl font-bold" dir="ltr">{formatCurrency(netProfit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Rates */}
      {showRates && (
        <div className="bg-white rounded-2xl border border-violet-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-violet-100 bg-violet-50/80 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-violet-800">أسعار الاشتراكات</h2>
              <p className="text-xs text-violet-600 mt-0.5">اضغط على المبلغ لتغييره</p>
            </div>
            <button onClick={() => handleAddNewYear()} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              صف جديد
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableYears.map(year => {
              const rate = rates[year] || 0;
              return (
                <div key={year} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{year}</p>
                    <p className="text-xs text-slate-400 mt-0.5">رسوم الاشتراك</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={rates[year] ?? ""}
                    onChange={e => {
                      const next = { ...rates, [year]: e.target.value === "" ? 0 : Number(e.target.value) };
                      setRates(next);
                      setStoredRates(next);
                    }}
                    placeholder="0"
                    className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm text-center font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              );
            })}

            {availableYears.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 text-sm">لا توجد صفوف دراسية بعد</div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Form */}
      {showForm && (
        <form onSubmit={handleAddExpense} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">إضافة مصروف جديد</h3>
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">بيان المصروف</label>
              <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="مثال: فاتورة كهرباء" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">المبلغ (ج.م)</label>
              <input type="number" required min="1" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="500" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60">
                {submitting ? "..." : "+ إضافة"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">إلغاء</button>
            </div>
          </div>
        </form>
      )}

      {/* Expenses */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="font-bold text-slate-800">سجل المصروفات</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-400">لا يوجد سجل مصروفات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold text-slate-600">البيان</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">المبلغ</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">التاريخ</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 w-16">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{exp.title}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteExpense(exp._id)} className="text-xs text-red-500 hover:text-red-700">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-slate-800">سجل الاشتراكات</h2>
          <div className="flex items-center gap-2">
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
              <option value="">كل الشهور</option>
              {availableMonths.map(m => (<option key={m} value={m}>{m}</option>))}
            </select>
            {filterMonth && (
              <button onClick={() => setFilterMonth("")} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>
          <span className="text-xs text-slate-500">من أحدث لأقدم</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-400">لا يوجد سجل اشتراكات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold text-slate-600">الطالب</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">الشهر</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">المبلغ</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">تاريخ الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(pay => (
                  <tr key={pay._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{(pay.student?.name || "?").charAt(0)}</div>
                        <span className="font-medium text-slate-800">{pay.student?.name || "طالب محذوف"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{pay.month}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(pay.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(pay.date)}</td>
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

export default Accounting;
