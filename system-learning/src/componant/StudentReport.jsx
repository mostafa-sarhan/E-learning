import React, { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("ar-EG", { year: 'numeric', month: 'short', day: 'numeric' }) + ' - ' + d.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return name.charAt(0);
}

function StudentReport() {
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [paymentsMap, setPaymentsMap] = useState({});
  const [exams, setExams] = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");

  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const currentMonth = MONTHS[new Date().getMonth()];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, paymentsRes, examsRes] = await Promise.all([
        fetch(`${API_BASE}/api/students`),
        fetch(`${API_BASE}/api/payments`),
        fetch(`${API_BASE}/api/exams`),
      ]);

      const studentsData = studentsRes.ok ? await studentsRes.json() : [];
      if (studentsRes.ok) setStudents(studentsData);

      if (paymentsRes.ok) {
        const payments = await paymentsRes.json();
        const map = {};
        payments.forEach(p => {
          const sid = typeof p.student === 'string' ? p.student : p.student?._id;
          if (sid) {
            if (!map[sid]) map[sid] = [];
            map[sid].push(p);
          }
        });
        setPaymentsMap(map);
      }

      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExams(examsData);

        const submissionsMapData = {};
        await Promise.all(
          examsData.map(async (exam) => {
            try {
              const res = await fetch(`${API_BASE}/api/exams/${exam._id}/results`);
              if (res.ok) {
                const results = await res.json();
                results.forEach(sub => {
                  if (!sub.student) return;
                  const studentId = typeof sub.student === 'string' ? sub.student : sub.student._id;
                  if (!submissionsMapData[studentId]) submissionsMapData[studentId] = [];
                  submissionsMapData[studentId].push({ ...sub, examTitle: exam.title, examDate: exam.date });
                });
              }
            } catch (e) {
              console.error(`Failed to fetch results for exam ${exam._id}`, e);
            }
          })
        );
        setSubmissionsMap(submissionsMapData);
      }

      const attendanceMapData = {};
      await Promise.all(
        studentsData.map(async (student) => {
          try {
            const res = await fetch(`${API_BASE}/api/attendance/student/${student._id}`);
            if (res.ok) {
              const history = await res.json();
              attendanceMapData[student._id] = history;
            }
          } catch (e) {
            console.error(`Failed to fetch attendance for student ${student._id}`, e);
          }
        })
      );
      setAttendanceMap(attendanceMapData);
    } catch (e) {
      console.error("Failed to fetch report data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableYears = useMemo(() => {
    const years = new Set(students.map(s => s.academicYear).filter(Boolean));
    return Array.from(years);
  }, [students]);

  const availableGroups = useMemo(() => {
    const filtered = selectedYear
      ? students.filter(s => s.academicYear === selectedYear)
      : students;
    const groups = new Map();
    filtered.forEach(s => {
      if (s.group) {
        groups.set(s.group._id, s.group.name);
      }
    });
    return Array.from(groups.entries());
  }, [students, selectedYear]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesYear = selectedYear ? student.academicYear === selectedYear : true;
      const matchesSearch = searchQuery
        ? student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.phone.includes(searchQuery)
        : true;
      const matchesGroup = selectedGroup ? student.group?._id === selectedGroup : true;
      const matchesPaymentStatus = selectedPaymentStatus
        ? (() => {
            const hasPaid = (paymentsMap[student._id] || []).some(p => p.month === currentMonth);
            return selectedPaymentStatus === "paid" ? hasPaid : !hasPaid;
          })()
        : true;
      return matchesYear && matchesSearch && matchesGroup && matchesPaymentStatus;
    });
  }, [students, selectedYear, searchQuery, selectedGroup, selectedPaymentStatus, paymentsMap, currentMonth]);

  const getAttendanceStats = (studentId) => {
    const records = attendanceMap[studentId] || [];
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, percentage, records };
  };

  const getLastPaidMonth = (studentId) => {
    const payments = paymentsMap[studentId] || [];
    if (payments.length === 0) return null;
    const sorted = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0];
  };

  const getPaymentStats = (studentId) => {
    const payments = paymentsMap[studentId] || [];
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const monthsPaid = payments.map(p => p.month);
    return { totalPaid, paymentCount: payments.length, monthsPaid };
  };

  const getExamStats = (studentId) => {
    const submissions = submissionsMap[studentId] || [];
    let totalScore = 0;
    let totalPossible = 0;

    const examResults = submissions.map(sub => {
      const score = sub.score || 0;
      const maxScore = sub.totalPoints || 0;
      totalScore += score;
      totalPossible += maxScore;
      return {
        examTitle: sub.examTitle,
        examDate: sub.examDate,
        score,
        maxScore,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
        submittedAt: sub.submittedAt,
      };
    });

    const overallPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    return { examResults, totalScore, totalPossible, overallPercentage };
  };

  const getLastExam = (studentId) => {
    const submissions = submissionsMap[studentId] || [];
    if (submissions.length === 0) return null;
    const sorted = [...submissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const last = sorted[0];
    const score = last.score || 0;
    const maxScore = last.totalPoints || 0;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return {
      examTitle: last.examTitle,
      score,
      maxScore,
      percentage,
      submittedAt: last.submittedAt,
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (selectedStudent) {
    const attendanceStats = getAttendanceStats(selectedStudent._id);
    const paymentStats = getPaymentStats(selectedStudent._id);
    const examStats = getExamStats(selectedStudent._id);

    return (
      <div className="space-y-8 max-w-6xl mx-auto pb-12 px-4 sm:px-0">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedStudent(null)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {getInitials(selectedStudent.name)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{selectedStudent.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{selectedStudent.academicYear} • {selectedStudent.group?.name || "بدون مجموعة"}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">نسبة الحضور</p>
                <p className="text-xl font-bold text-emerald-600">{attendanceStats.percentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">عدد الامتحانات</p>
                <p className="text-xl font-bold text-violet-600">{examStats.examResults.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">متوسط النتائج</p>
                <p className={`text-xl font-bold ${examStats.overallPercentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{examStats.overallPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="font-bold text-slate-800">سجل الحضور</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    حاضر: {attendanceStats.present}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    غائب: {attendanceStats.absent}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-700">{attendanceStats.percentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${attendanceStats.percentage}%` }}
                />
              </div>
              {attendanceStats.records.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attendanceStats.records.map((record, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{formatDateTime(record.date)}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold ${
                        record.status === "present"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {record.status === "present" ? "حاضر" : "غائب"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="font-bold text-slate-800">المدفوعات</h2>
            </div>
            <div>
              {(paymentsMap[selectedStudent._id] || []).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">لا توجد مدفوعات بعد</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-3 font-semibold text-slate-600 text-xs">الشهر</th>
                        <th className="px-5 py-3 font-semibold text-slate-600 text-xs">المبلغ</th>
                        <th className="px-5 py-3 font-semibold text-slate-600 text-xs">التاريخ</th>
                        <th className="px-5 py-3 font-semibold text-slate-600 text-xs">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(paymentsMap[selectedStudent._id] || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3 font-medium text-slate-700 text-xs">{p.month}</td>
                          <td className="px-5 py-3 text-xs font-bold text-blue-600">{p.amount} ج.م</td>
                          <td className="px-5 py-3 text-xs text-slate-500">{formatDate(p.date)}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              مدفوع
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80">
            <h2 className="font-bold text-slate-800">نتائج الامتحانات</h2>
          </div>
          {examStats.examResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">لم يقدم أي امتحانات بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 font-semibold text-slate-600">الامتحان</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">التاريخ</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">الدرجة</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-center">النسبة</th>
                    <th className="px-5 py-3 font-semibold text-slate-600">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {examStats.examResults.map((exam, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 font-medium text-slate-800">{exam.examTitle}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{formatDate(exam.examDate)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-medium">{exam.score}/{exam.maxScore}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${exam.percentage >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${exam.percentage}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${exam.percentage >= 50 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {exam.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          exam.percentage >= 50
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {exam.percentage >= 50 ? 'ناجح' : 'راسب'}
                        </span>
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

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { 
            position: relative !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            padding: 20px !important; 
            margin: 0 !important;
            direction: rtl; 
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          .print-header { display: block !important; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #4f46e5; page-break-after: avoid; }
          .print-header h1 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; }
          .print-header p { font-size: 13px; color: #64748b; margin: 0 0 4px 0; }
          .print-header .print-info { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; }
          .print-header .print-info span { font-size: 13px; color: #475569; font-weight: 600; }
          .print-table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          .print-table th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; padding: 8px 8px; border-bottom: 2px solid #e2e8f0; text-align: right; font-weight: 700; color: #475569; }
          .print-table td { font-size: 10px; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155; }
          .print-table tr { page-break-inside: avoid; }
          .print-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-bar { display: inline-block; height: 6px; border-radius: 3px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-footer { display: block !important; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; page-break-after: avoid; }
          .print-avatar { display: inline-block; width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #818cf8, #a855f7); color: white; text-align: center; line-height: 28px; font-size: 10px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-group-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; background: #f1f5f9; color: #475569; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-table th:nth-child(3),
          .print-table td:nth-child(3) { display: none !important; }
          .print-paid { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; background: #ecfdf5; color: #047857; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-unpaid { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; background: #fef2f2; color: #b91c1c; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: auto; margin: 10mm; }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
        }
      `}</style>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" dir="rtl">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                    {getInitials(selectedStudent.name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                    <p className="text-sm text-white/80">{selectedStudent.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 rounded-xl hover:bg-white/20 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{getAttendanceStats(selectedStudent._id).percentage}%</p>
                  <p className="text-xs text-emerald-600 mt-1">الحضور</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{getPaymentStats(selectedStudent._id).totalPaid} ج.م</p>
                  <p className="text-xs text-blue-600 mt-1">المدفوع</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-violet-700">{getExamStats(selectedStudent._id).exams.length}</p>
                  <p className="text-xs text-violet-600 mt-1">الامتحانات</p>
                </div>
              </div>

              {getExamStats(selectedStudent._id).exams.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    سجل الامتحانات
                  </h3>
                  <div className="bg-slate-50 rounded-xl overflow-hidden">
                    {getExamStats(selectedStudent._id).exams.slice(-5).reverse().map((ex, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                        <span className="text-sm text-slate-600">{ex.exam?.subject || "امتحان"}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${ex.percentage >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${ex.percentage}%` }}></div>
                          </div>
                          <span className={`text-sm font-bold ${ex.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{ex.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(paymentsMap[selectedStudent._id] || []).length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    سجل المدفوعات
                  </h3>
                  <div className="bg-slate-50 rounded-xl overflow-hidden">
                    {(paymentsMap[selectedStudent._id] || []).slice().reverse().slice(0, 6).map((p, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                        <div>
                          <span className="text-sm text-slate-600">{p.month}</span>
                          <p className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString("ar-EG")}</p>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{p.amount} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div id="print-section">
        <div className="print-header no-print" style={{ display: 'none' }}>
          <h1>تقرير الطلاب الشامل</h1>
          <p>عرض شامل للحضور، نتائج الامتحانات، وحالة المدفوعات لكل طالب</p>
          <div className="print-info">
            <span>📅 تاريخ التقرير: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
            {selectedYear && <span>🎓 الصف الدراسي: {selectedYear}</span>}
            {selectedGroup && (() => {
              const group = availableGroups.find(([id]) => id === selectedGroup);
              return group ? <span>👥 المجموعة: {group[1]}</span> : null;
            })()}
            {selectedPaymentStatus && <span>💳 حالة الشهر: {selectedPaymentStatus === "paid" ? "مدفوع" : "غير مدفوع"}</span>}
            <span>👤 عدد الطلاب: {filteredStudents.length} طالب</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">تقرير الطلاب</h1>
            <p className="text-sm text-slate-500 mt-0.5">إحصائيات شاملة لكل طالب</p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/25"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة التقرير
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 no-print">
          <div className="relative flex-1">
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب أو رقم الهاتف..."
              className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
            />
          </div>
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setSelectedGroup(""); }}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition min-w-[140px]"
          >
            <option value="">جميع الصفوف</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition min-w-[140px]"
          >
            <option value="">جميع المجموعات</option>
            {availableGroups.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition min-w-[140px]"
          >
            <option value="">حالة الشهر</option>
            <option value="paid">مدفوع</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="font-bold text-slate-800">قائمة الطلاب</h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">{filteredStudents.length}</span>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">لا يوجد طلاب</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm print-table">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs">#</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs">الطالب</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs">المجموعة</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs text-center">الحضور</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs text-center">آخر امتحان</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs text-center">حالة الشهر</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs">آخر شهر مدفوع</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, i) => {
                    const att = getAttendanceStats(student._id);

                    return (
                      <tr key={student._id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition">
                        <td className="px-5 py-4 text-slate-400 text-xs font-medium">{i + 1}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm print-avatar">
                              {getInitials(student.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                              <p className="text-xs text-slate-400">{student.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {student.group ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 print-group-badge">
                              {student.group.name}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden print-bar">
                              <div
                                className={`h-full rounded-full ${att.percentage >= 70 ? 'bg-emerald-500' : att.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(att.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{att.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {(() => {
                            const last = getLastExam(student._id);
                            if (!last) return <span className="text-xs text-slate-300">—</span>;
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden print-bar">
                                  <div
                                    className={`h-full rounded-full ${last.percentage >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${last.percentage}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${last.percentage >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {last.percentage}%
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {(() => {
                            const hasPaidCurrentMonth = (paymentsMap[student._id] || []).some(p => p.month === currentMonth);
                            if (hasPaidCurrentMonth) {
                              return (
                                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 print-paid">
                                  مدفوع
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 print-unpaid">
                                غير مدفوع
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const lastPaid = getLastPaidMonth(student._id);
                            if (!lastPaid) return <span className="text-xs text-slate-300">—</span>;
                            return (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 print-group-badge">
                                {lastPaid.month}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 no-print">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="عرض التفاصيل"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
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

        <div className="print-footer no-print" style={{ display: 'none' }}>
          <p>تم إنشاء التقرير من أكاديمية التعليم — نظام الإدارة الشامل</p>
        </div>
      </div>
    </div>
  );
}

export default StudentReport;
