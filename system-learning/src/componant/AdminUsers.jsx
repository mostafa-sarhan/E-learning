import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("employee");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`);
      if (res.ok) {
        const allUsers = await res.json();
        setUsers(allUsers.filter(u => u.role === "admin" || u.role === "employee"));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) { alert("الرجاء تعبئة جميع الحقول"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
      });
      if (res.ok) { setFormName(""); setFormEmail(""); setFormPassword(""); setShowForm(false); fetchUsers(); }
      else { const data = await res.json(); alert(data.message || "فشل في إضافة المستخدم"); }
    } catch (e) { alert("حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleChangeRole = async (id, newRole) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("حذف هذا المستخدم؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const roleBadge = (role) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700";
      case "employee": return "bg-blue-100 text-blue-700";
      case "student": return "bg-emerald-100 text-emerald-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const roleLabel = (role) => {
    switch (role) {
      case "admin": return "مدير";
      case "employee": return "موظف";
      case "student": return "طالب";
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">إدارة المستخدمين</h1>
          <p className="mt-1 text-sm text-slate-600">إدارة الأدوار والموظفين في النظام</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          مستخدم جديد
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">إضافة مستخدم جديد</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">الاسم</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">البريد الإلكتروني</label>
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">كلمة المرور</label>
              <input type="text" value={formPassword} onChange={e => setFormPassword(e.target.value)} required dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">الدور</label>
              <select value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50">
                <option value="employee">موظف</option>
                <option value="admin">مدير</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60">{submitting ? "..." : "حفظ"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-3 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">إلغاء</button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="font-bold text-slate-800">قائمة المستخدمين ({users.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold text-slate-600">الاسم</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">البريد الإلكتروني</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">الدور</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 w-20">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">{u.name.charAt(0)}</div>
                        <span className="font-medium text-slate-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-mono text-xs" dir="ltr">{u.email}</td>
                    <td className="px-5 py-4">
                      <select value={u.role} onChange={e => handleChangeRole(u._id, e.target.value)} className={`rounded-full px-3 py-1 text-xs font-bold border-0 cursor-pointer outline-none ${roleBadge(u.role)}`}>
                        <option value="admin">مدير</option>
                        <option value="employee">موظف</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => handleDelete(u._id)} className="text-xs text-red-500 hover:text-red-700">حذف</button>
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

export default AdminUsers;
