import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function Home() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";
  const [stats, setStats] = useState({ students: 0, groups: 0, exams: 0, revenue: 0 });
  const [studentsData, setStudentsData] = useState([]);
  const [groupsData, setGroupsData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = fetch(`${API_BASE}/api/students`).then(res => res.json());
    const fetchGroups = fetch(`${API_BASE}/api/groups`).then(res => res.json());
    const fetchExams = fetch(`${API_BASE}/api/exams`).then(res => res.json());
    const fetchPayments = isAdmin ? fetch(`${API_BASE}/api/payments`).then(res => res.json()) : Promise.resolve([]);
    const fetchAttendance = fetch(`${API_BASE}/api/attendance/stats`).then(res => res.json()).catch(() => []);

    Promise.all([fetchStudents, fetchGroups, fetchExams, fetchPayments, fetchAttendance])
      .then(([students, groups, exams, payments, attendance]) => {
        const studentsArr = Array.isArray(students) ? students : [];
        const groupsArr = Array.isArray(groups) ? groups : [];
        const examsArr = Array.isArray(exams) ? exams : [];
        const paymentsArr = Array.isArray(payments) ? payments : [];

        setStudentsData(studentsArr);
        setGroupsData(groupsArr);
        setStats({
          students: studentsArr.length,
          groups: groupsArr.length,
          exams: examsArr.length,
          revenue: paymentsArr.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        });
        setAttendanceData(Array.isArray(attendance) ? attendance : []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const monthlyData = useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const data = months.map((month, index) => {
      const studentsInMonth = studentsData.filter(s => {
        if (!s.createdAt) return false;
        const date = new Date(s.createdAt);
        return date.getMonth() === index;
      }).length;
      const revenueInMonth = studentsData.reduce((sum, s) => {
        if (!s.createdAt) return sum;
        const date = new Date(s.createdAt);
        if (date.getMonth() === index) {
          return sum + (Number(s.totalPaid) || Number(s.fees) || 0);
        }
        return sum;
      }, 0);
      return { month, students: studentsInMonth, revenue: revenueInMonth };
    });
    return data;
  }, [studentsData]);

  const groupDistribution = useMemo(() => {
    return groupsData.slice(0, 6).map(g => ({
      name: g.name || g.title || 'مجموعة',
      value: g.studentsCount ?? 0,
    }));
  }, [groupsData]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  const quickLinks = [
    { to: "/new-student", label: "إضافة طالب جديد", color: "indigo", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
    { to: "/attendance", label: "أخذ الغياب", color: "emerald", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { to: "/exams", label: "جدولة امتحان", color: "purple", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { to: "/groups", label: "إدارة المجموعات", color: "blue", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    ...(isAdmin ? [
      { to: "/accounting", label: "إدارة الحسابات", color: "amber", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
      { to: "/student-accounts", label: "حسابات الطلاب", color: "rose", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
    ] : []),
  ];

  const colorMap = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", gradient: "from-indigo-500 to-indigo-600", hover: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-emerald-600", hover: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", gradient: "from-amber-500 to-amber-600", hover: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", gradient: "from-purple-500 to-purple-600", hover: "hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-blue-600", hover: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-rose-600", hover: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300" },
  };

  const StatCard = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{loading ? (
            <span className="inline-block w-16 h-7 bg-slate-200 rounded animate-pulse"></span>
          ) : typeof value === 'number' && value > 999 ? (
            <span>{value.toLocaleString('ar-EG')}</span>
          ) : (
            <span>{value}</span>
          )}</p>
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% عن الشهر السابق
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]?.gradient || 'from-slate-400 to-slate-500'} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 rounded-3xl p-8 text-white overflow-hidden shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">مرحباً بك في أكاديمية التعليم</h1>
              <p className="text-blue-100 text-sm mt-1">لوحة تحكم شاملة لإدارة الطلاب والمجموعات والحسابات</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-blue-300/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الطلاب" value={stats.students} color="indigo" trend={12} icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        <StatCard title="المجموعات النشطة" value={stats.groups} color="emerald" trend={8} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <StatCard title="الامتحانات" value={stats.exams} color="purple" trend={5} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        {isAdmin && (
          <StatCard title="الإيرادات" value={stats.revenue} color="amber" trend={15} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue/Students Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">إحصائيات الطلاب والإيرادات</h3>
              <p className="text-sm text-slate-500 mt-1">نظرة عامة على الأداء الشهري</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-slate-600">الطلاب</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">الإيرادات</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorStudents)" />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Group Distribution Pie */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">توزيع المجموعات</h3>
            <p className="text-sm text-slate-500 mt-1">نسبة الطلاب في كل مجموعة</p>
          </div>
          {groupDistribution.length === 0 || groupDistribution.every(g => g.value === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-500">لا توجد مجموعات بعد</p>
              <Link to="/groups" className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                إضافة مجموعة جديدة ←
              </Link>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={groupDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {groupDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {groupDistribution.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Weekly Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">الحضور الأسبوعي</h3>
            <p className="text-sm text-slate-500 mt-1">ملخص الحضور والغياب آخر 7 أيام</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="present" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} name="حضور" />
              <Bar dataKey="absent" fill="#fb7185" radius={[6, 6, 0, 0]} maxBarSize={30} name="غياب" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <span className="text-xs text-slate-600">حضور</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fb7185' }}></div>
              <span className="text-xs text-slate-600">غياب</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">الوصول السريع</h2>
            <p className="text-sm text-slate-500 mt-1">إجراءات شائعة يمكنك تنفيذها بسرعة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map(link => {
            const colors = colorMap[link.color];
            return (
              <Link key={link.to} to={link.to} className={`bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm ${colors.hover} transition-all duration-300 flex flex-col items-center justify-center gap-3 text-center group hover:shadow-lg hover:-translate-y-1`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={link.icon} />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-700">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default Home
