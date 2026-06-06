import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Landing() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
      title: "إدارة الطلاب",
      desc: "سجّل بيانات الطلاب، تابع حضورهم، واحفظ تقاريرهم الأكاديمية في مكان واحد",
    },
    {
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      title: "المجموعات التعليمية",
      desc: "نظّم الطلاب في مجموعات ذكية مع جداول مرنة وتقارير أداء مفصّلة",
    },
    {
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      title: "جدولة المواعيد",
      desc: "أنشئ جداول المحاضرات والحصص مع تنبيهات تلقائية وتذكيرات ذكية",
    },
    {
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      title: "الامتحانات والتقييم",
      desc: "صمّم امتحانات متنوعة، صحّحها آلياً، وتابع تقدّم كل طالب بسهولة",
    },
    {
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      title: "الحضور والغياب",
      desc: "سجّل الحضور لحظة بلحظة مع إشعارات واتساب تلقائية لولي الأمر",
    },
    {
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      title: "الحسابات والمالية",
      desc: "تتبّع المدفوعات والمصروفات مع تقارير مالية شاملة ولوحة تحكم مالية متكاملة",
    },
  ]

  const stats = [
    { value: "١٠٠٠+", label: "طالب مسجّل" },
    { value: "٥٠+", label: "مجموعة تعليمية" },
    { value: "٩٨٪", label: "نسبة الرضا" },
    { value: "٢٤/٧", label: "دعم فني" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Navbar */}
      <nav className={`relative z-10 flex items-center justify-between px-8 py-5 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">أكاديمية التعليم</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            لوحة التحكم
          </Link>
          <Link to="/student-portal" className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
            تسجيل الدخول
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className={`relative z-10 max-w-6xl mx-auto px-8 pt-16 pb-24 text-center transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>نظام إدارة تعليمي متكامل</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
          أدر أكاديميتك
          <span className="block mt-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            بذكاء وسهولة
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          منصة شاملة لإدارة الطلاب والمجموعات والحضور والامتحانات والحسابات.
          كل ما تحتاجه في مكان واحد مع واجهة سهلة واحترافية
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/student-portal" className="group px-8 py-4 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 flex items-center gap-3">
            <span>تسجيل الدخول</span>
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link to="/dashboard" className="px-8 py-4 text-base font-semibold text-slate-300 border border-slate-700 rounded-2xl hover:border-slate-500 hover:text-white transition-all hover:-translate-y-1">
            لوحة التحكم
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className={`relative z-10 max-w-5xl mx-auto px-8 pb-20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all hover:-translate-y-1">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className={`relative z-10 max-w-6xl mx-auto px-8 pb-24 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">كل ما تحتاجه لإدارة أكاديميتك</h2>
          <p className="text-slate-400 max-w-xl mx-auto">أدوات متكاملة صُممت خصيصاً لتلبية احتياجات المؤسسات التعليمية</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className={`relative z-10 max-w-4xl mx-auto px-8 pb-24 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4aDEyVjZIMzZ2MTJ6TTE4IDM2aDEyVjI0SDE4djEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">جاهز تبدأ؟</h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-lg mx-auto">ادخل منصة الطلاب وابدأ رحلتك التعليمية الآن</p>
            <Link to="/student-portal" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 font-semibold rounded-2xl hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1">
              <span>ادخل لوحة التحكم</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-8 border-t border-white/10">
        <p className="text-sm text-slate-500">© 2026 أكاديمية التعليم. جميع الحقوق محفوظة</p>
      </div>
    </div>
  )
}

export default Landing
