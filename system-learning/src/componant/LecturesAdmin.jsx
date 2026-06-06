import React, { useState, useEffect, useCallback, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const GRADES = ["الصف الاول", "الصف الثانى", "الصف الثالث"];
const GRADE_COLORS = {
  "الصف الاول": { bg: "from-blue-500 to-cyan-500", badge: "bg-blue-100 text-blue-700", light: "bg-blue-50", border: "border-blue-200", ring: "focus:ring-blue-500/20 focus:border-blue-500" },
  "الصف الثانى": { bg: "from-violet-500 to-purple-500", badge: "bg-violet-100 text-violet-700", light: "bg-violet-50", border: "border-violet-200", ring: "focus:ring-violet-500/20 focus:border-violet-500" },
  "الصف الثالث": { bg: "from-amber-500 to-orange-500", badge: "bg-amber-100 text-amber-700", light: "bg-amber-50", border: "border-amber-200", ring: "focus:ring-amber-500/20 focus:border-amber-500" },
};

function gradeShort(g) {
  if (!g) return "";
  if (g.includes("الاول")) return "1st";
  if (g.includes("الثاني") || g.includes("الثانى")) return "2nd";
  if (g.includes("الثالث")) return "3rd";
  return g;
}

function extractVimeoId(input) {
  const trimmed = input?.trim() || "";
  const match = trimmed.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : trimmed.replace(/\D/g, "");
}

function VimeoThumbnail({ vimeoId, title, onPlay }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const id = extractVimeoId(vimeoId);

  useEffect(() => {
    if (!id) return;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
    img.src = `https://vumbnail.com/${id}.jpg`;
  }, [id]);

  return (
    <div className="relative w-full aspect-video rounded-xl bg-slate-900 overflow-hidden cursor-pointer group" onClick={onPlay}>
      {!error && loaded && (
        <img src={`https://vumbnail.com/${id}.jpg`} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
          <svg className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span>فشل تحميل الصورة</span>
        </div>
      )}
    </div>
  );
}

function VideoModal({ vimeoId, title, onClose }) {
  const id = extractVimeoId(vimeoId);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <h3 className="text-white font-semibold text-sm truncate ml-3">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="relative" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={`https://player.vimeo.com/video/${id}?autoplay=1&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
            className="absolute inset-0 w-full h-full"
            frameBorder="0" allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            title={title}
          />
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ lecture, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">حذف المحاضرة</h3>
        <p className="text-sm text-slate-500 mb-2">هل أنت متأكد من حذف هذه المحاضرة؟</p>
        <p className="text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg p-2 mb-6 truncate">"{lecture.title}"</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">إلغاء</button>
          <button onClick={() => onConfirm(lecture._id)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition">حذف</button>
        </div>
      </div>
    </div>
  );
}

function CreateUnitModal({ grade, units, onSave, onCancel, submitting }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("الرجاء إدخال اسم الوحدة"); return; }
    if (units.some(u => u.name === name.trim())) { setError("هذه الوحدة موجودة بالفعل"); return; }
    setError("");
    await onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">إنشاء وحدة جديدة</h3>
              <p className="text-xs text-slate-500 mt-0.5">{grade}</p>
            </div>
            <button type="button" onClick={onCancel} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">اسم الوحدة</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="مثال: الوحدة الاولي" autoFocus className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50 transition" />
            {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">إلغاء</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  جاري الحفظ...
                </span>
              ) : "حفظ"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function LecturesAdmin() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formGrade, setFormGrade] = useState(GRADES[0]);
  const [formUnit, setFormUnit] = useState("");
  const [formVimeoLink, setFormVimeoLink] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formOrder, setFormOrder] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [playingLecture, setPlayingLecture] = useState(null);
  const [deletingLecture, setDeletingLecture] = useState(null);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [notification, setNotification] = useState(null);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [creatingUnit, setCreatingUnit] = useState(false);

  const [localUnits, setLocalUnits] = useState(() => {
    try {
      const saved = sessionStorage.getItem("lecture_units");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    sessionStorage.setItem("lecture_units", JSON.stringify(localUnits));
  }, [localUnits]);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/lectures`);
      if (res.ok) {
        const raw = await res.json();
        setLectures(raw);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormTitle(""); setFormGrade(GRADES[0]); setFormUnit(""); setFormVimeoLink(""); setFormDesc(""); setFormOrder(""); setEditId(null); setShowForm(false);
  };

  const openAdd = (grade, unit) => {
    resetForm();
    if (grade) setFormGrade(grade);
    if (unit) setFormUnit(unit);
    setShowForm(true);
  };

  const openEdit = (l) => {
    setFormTitle(l.title); setFormGrade(l.academicYear); setFormUnit(l.section || ""); setFormVimeoLink(l.vimeoId); setFormDesc(l.description || ""); setFormOrder(String(l.order ?? 0)); setEditId(l._id); setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle || !formVimeoLink) { showNotif("الرجاء تعبئة العنوان والرابط", "error"); return; }
    setSubmitting(true);
    try {
      const body = { title: formTitle, academicYear: formGrade, vimeoId: formVimeoLink, description: formDesc, order: Number(formOrder) || 0, section: formUnit || undefined };
      const url = editId ? `${API_BASE}/api/lectures/${editId}` : `${API_BASE}/api/lectures`;
      const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { resetForm(); fetchData(); showNotif(editId ? "تم تعديل المحاضرة بنجاح" : "تم إضافة المحاضرة بنجاح"); }
      else { const d = await res.json(); showNotif(d.message || "فشل في الحفظ", "error"); }
    } catch { showNotif("حدث خطأ", "error"); }
    finally { setSubmitting(false); }
  };

  const handleCreateUnit = async (unitName) => {
    setCreatingUnit(true);
    setLocalUnits(prev => ({
      ...prev,
      [formGrade]: [...(prev[formGrade] || []), unitName],
    }));
    setFormUnit(unitName);
    setShowUnitModal(false);
    showNotif(`تم إنشاء الوحدة "${unitName}" بنجاح`);
    setCreatingUnit(false);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/lectures/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) { fetchData(); showNotif("تم حذف المحاضرة"); }
    } catch (e) { console.error(e); }
    finally { setDeletingLecture(null); }
  };

  const filtered = useMemo(() => {
    return lectures.filter(l => {
      const yearMatch = !filterYear || l.academicYear === filterYear;
      const searchMatch = !search || l.title.toLowerCase().includes(search.toLowerCase()) || (l.description?.toLowerCase().includes(search.toLowerCase())) || (l.section?.toLowerCase().includes(search.toLowerCase()));
      return yearMatch && searchMatch;
    });
  }, [lectures, filterYear, search]);

  const groupedByYear = useMemo(() => {
    const groups = {};
    filtered.forEach(l => {
      if (!groups[l.academicYear]) groups[l.academicYear] = {};
      const section = l.section || "بدون وحدة";
      if (!groups[l.academicYear][section]) groups[l.academicYear][section] = [];
      groups[l.academicYear][section].push(l);
    });
    return groups;
  }, [filtered]);

  const totalByYear = useMemo(() => {
    const t = {};
    lectures.forEach(l => { t[l.academicYear] = (t[l.academicYear] || 0) + 1; });
    return t;
  }, [lectures]);

  const unitsByGrade = useMemo(() => {
    const map = {};
    lectures.forEach(l => {
      if (l.section) {
        if (!map[l.academicYear]) map[l.academicYear] = new Set();
        map[l.academicYear].add(l.section);
      }
    });
    Object.keys(localUnits).forEach(grade => {
      if (!map[grade]) map[grade] = new Set();
      localUnits[grade].forEach(u => map[grade].add(u));
    });
    const result = {};
    GRADES.forEach(g => { result[g] = map[g] ? Array.from(map[g]).sort() : []; });
    return result;
  }, [lectures, localUnits]);

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleSection = (year, section) => {
    const key = `${year}__${section}`;
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isSectionExpanded = (year, section) => {
    return expandedSections[`${year}__${section}`] === true;
  };

  const getSectionNumber = (section) => {
    const match = section.match(/(\d+)/);
    return match ? match[1] : null;
  };

  const gradeShort = (year) => year.replace("الصف ", "").replace(" الثان[ويى]", "");

  return (
    <div className="space-y-6 relative">
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-slide-down ${notification.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={notification.type === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M5 13l4 4L19 7"} /></svg>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">إدارة المحاضرات</h1>
          <p className="mt-1 text-sm text-slate-500">إضافة وتنظيم محاضرات Vimeo حسب الصف والوحدة الدراسية</p>
        </div>
        <button onClick={() => openAdd()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:shadow-xl hover:shadow-violet-300 hover:-translate-y-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          إضافة محاضرة
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">إجمالي المحاضرات</p>
              <p className="text-2xl font-bold mt-1">{lectures.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
            </div>
          </div>
        </div>
        {GRADES.map(grade => {
          const colors = GRADE_COLORS[grade];
          const count = totalByYear[grade] || 0;
          return (
            <div key={grade} className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/80 font-medium">{gradeShort(grade)}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
                {/* <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
                  {gradeShort(grade).slice(0, 2)}
                </div> */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الوصف أو الوحدة..." className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white" />
        </div>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white sm:w-44">
          <option value="">كل الصفوف</option>
          {GRADES.map(y => <option key={y} value={y}>{gradeShort(y)}</option>)}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={editId ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{editId ? "تعديل المحاضرة" : "إضافة محاضرة جديدة"}</h3>
                {!editId && <p className="text-xs text-slate-500 mt-0.5">اختر الصف والوحدة ثم أدخل بيانات المحاضرة</p>}
              </div>
            </div>
            <button onClick={resetForm} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-5">
            {/* Classification Section */}
            <div className="bg-slate-50/50 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">التصنيف</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">الصف الدراسي</label>
                  <select value={formGrade} onChange={e => { setFormGrade(e.target.value); setFormUnit(""); }} className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white transition ${GRADE_COLORS[formGrade].ring}`}>
                    {GRADES.map(y => <option key={y} value={y}>{gradeShort(y)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">الوحدة الدراسية</label>
                  <div className="flex gap-2">
                    <select value={formUnit} onChange={e => setFormUnit(e.target.value)} className={`flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white transition ${GRADE_COLORS[formGrade].ring}`}>
                      <option value="">بدون وحدة</option>
                      {unitsByGrade[formGrade]?.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowUnitModal(true)} className="shrink-0 px-3 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-semibold hover:bg-violet-200 transition flex items-center gap-1.5" title="إنشاء وحدة جديدة">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                  {unitsByGrade[formGrade]?.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1.5">لا توجد وحدات مضافة بعد. أنشئ أول وحدة الآن</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lecture Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">بيانات المحاضرة</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">عنوان المحاضرة *</label>
                  <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required placeholder="مثال: الدرس الأول - المقدمة" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">رابط Vimeo *</label>
                  <input type="text" value={formVimeoLink} onChange={e => setFormVimeoLink(e.target.value)} required placeholder="https://vimeo.com/1188618226" dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50 transition" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">الوصف (اختياري)</label>
                  <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="وصف مختصر للمحاضرة" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">ترتيب العرض</label>
                  <input type="number" value={formOrder} onChange={e => setFormOrder(e.target.value)} min="0" placeholder="0" dir="ltr" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50/50 transition" />
                </div>
              </div>
            </div>

            {/* Preview */}
            {formVimeoLink && extractVimeoId(formVimeoLink) && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">معاينة الفيديو:</p>
                <div className="max-w-sm rounded-xl overflow-hidden bg-black shadow-sm" style={{ position: "relative", paddingTop: "50.94%" }}>
                  <iframe src={`https://player.vimeo.com/video/${extractVimeoId(formVimeoLink)}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`} frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" title="preview" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="submit" disabled={submitting} className="flex-1 sm:flex-none sm:px-8 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    جاري الحفظ...
                  </span>
                ) : editId ? "حفظ التعديلات" : "إضافة المحاضرة"}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-3 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Lecture Groups by Year */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse"><div className="aspect-video bg-slate-200 rounded-xl mb-3" /><div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-200 rounded w-1/2" /></div>)}
        </div>
      ) : Object.keys(groupedByYear).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{search || filterYear ? "لا توجد نتائج" : "لا توجد محاضرات بعد"}</h3>
          <p className="text-sm text-slate-500 mb-4">{search || filterYear ? "جرب تغيير معايير البحث" : "ابدأ بإضافة أول محاضرة"}</p>
          {!search && !filterYear && (
            <button onClick={() => openAdd()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              إضافة محاضرة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {GRADES.filter(y => groupedByYear[y] || !filterYear).map(year => {
            const sections = groupedByYear[year];
            if (!sections) return null;
            const colors = GRADE_COLORS[year];
            const isExpanded = expandedYears[year] === true;
            const sortedSectionNames = Object.keys(sections).sort((a, b) => {
              if (a === "بدون وحدة") return 1;
              if (b === "بدون وحدة") return -1;
              return (getSectionNumber(a) || 0) - (getSectionNumber(b) || 0);
            });
            const yearLectureCount = sortedSectionNames.reduce((sum, s) => sum + sections[s].length, 0);

            return (
              <div key={year} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Year Header */}
                <div className={`flex items-center justify-between p-4 ${colors.light} border-b border-slate-100`}>
                  <button onClick={() => toggleYear(year)} className="flex items-center gap-3 flex-1 text-right">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
                      {gradeShort(year).slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{gradeShort(year)}</h3>
                      <p className="text-xs text-slate-500">{yearLectureCount} محاضرات · {sortedSectionNames.length} وحدات</p>
                    </div>
                  </button>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>

                {isExpanded && (
                  <div>
                    {sortedSectionNames.map(section => {
                      const sectionLectures = sections[section];
                      const hasSection = section !== "بدون وحدة";

                      return (
                        <div key={section} className="border-b last:border-b-0 border-slate-100">
                          {/* Unit Header */}
                          {hasSection && (
                            <div
                              className={`px-4 py-3 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition`}
                              onClick={() => toggleSection(year, section)}
                            >
                              <div className="flex items-center gap-2.5">
                                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSectionExpanded(year, section) ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                <div className={`w-8 h-8 rounded-lg ${colors.light} border ${colors.border} flex items-center justify-center`}>
                                  <span className={`text-xs font-bold ${colors.badge.split(" ").pop()}`}>{getSectionNumber(section) || "#"}</span>
                                </div>
                                <h4 className="font-bold text-sm text-slate-800">{section}</h4>
                                <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{sectionLectures.length}</span>
                              </div>
                              <button onClick={e => { e.stopPropagation(); openAdd(year, section); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700 transition shadow-sm">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                محاضرة
                              </button>
                            </div>
                          )}

                          {/* Lectures Grid */}
                          {isSectionExpanded(year, section) && (
                            <div className={`p-4 ${hasSection ? "pt-2" : ""}`}>
                              {!hasSection && (
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-sm text-slate-700">بدون وحدة</h4>
                                  <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{sectionLectures.length}</span>
                                </div>
                              )}
                              {sectionLectures.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">لا توجد محاضرات في هذه الوحدة</div>
                              ) : (
                                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {sectionLectures.map((l, i) => (
                                    <div key={l._id} className="group rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-white">
                                      <VimeoThumbnail vimeoId={l.vimeoId} title={l.title} onPlay={() => setPlayingLecture(l)} />
                                      <div className="p-3.5">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                          <span className="text-[10px] font-bold text-slate-300">{String(i + 1).padStart(2, "0")}</span>
                                          <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg text-slate-300 hover:text-violet-600 hover:bg-violet-50 transition" title="تعديل">
                                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button onClick={() => setDeletingLecture(l)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition" title="حذف">
                                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                          </div>
                                        </div>
                                        <h4 className="font-semibold text-sm text-slate-800">{l.title}</h4>
                                        {l.description && <p className="text-xs text-slate-400 mt-1 truncate">{l.description}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Mobile List */}
                              <div className="sm:hidden space-y-4">
                                {sectionLectures.map(l => (
                                  <div key={l._id} className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                                    <VimeoThumbnail vimeoId={l.vimeoId} title={l.title} onPlay={() => setPlayingLecture(l)} />
                                    <div className="p-3">
                                      <h4 className="font-semibold text-sm text-slate-800">{l.title}</h4>
                                      {l.description && <p className="text-xs text-slate-400 mt-1">{l.description}</p>}
                                      <div className="flex gap-2 mt-2">
                                        <button onClick={() => openEdit(l)} className="flex-1 py-2 rounded-lg text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition">تعديل</button>
                                        <button onClick={() => setDeletingLecture(l)} className="flex-1 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition">حذف</button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {playingLecture && <VideoModal vimeoId={playingLecture.vimeoId} title={playingLecture.title} onClose={() => setPlayingLecture(null)} />}
      {deletingLecture && <ConfirmDelete lecture={deletingLecture} onConfirm={handleDelete} onCancel={() => setDeletingLecture(null)} />}
      {showUnitModal && <CreateUnitModal grade={formGrade} units={unitsByGrade[formGrade] || []} onSave={handleCreateUnit} onCancel={() => setShowUnitModal(false)} submitting={creatingUnit} />}
    </div>
  );
}
