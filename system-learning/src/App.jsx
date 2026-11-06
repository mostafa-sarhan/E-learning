import { useState, useEffect, createContext } from 'react';
import './App.css';
import Right from './componant/right';
import Left from './componant/Left';
import Landing from './componant/Landing';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './componant/Login';
import StudentPortal from './componant/StudentPortal';
import StudentProgressReport from './componant/StudentProgressReport';
import StudentReport from './componant/StudentReport';

const AuthContext = createContext(null);

function readSavedUser() {
  try {
    const saved = JSON.parse(localStorage.getItem('user') || 'null');
    // Sessions saved before token auth existed are no longer valid.
    return saved?.token ? saved : null;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(readSavedUser);

  // Drop in-memory sessions that no longer exist in storage: pages restored by Back from the
  // browser's back/forward cache after logout, and logouts in another tab.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !readSavedUser()) setUser(null);
    };
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === null) setUser(readSavedUser());
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Clears every place a session is kept: staff session (localStorage) and the
  // student-portal session (sessionStorage). Theme and app settings are not session data.
  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('user');
      sessionStorage.removeItem('student_session');
    } catch {
      // Storage unavailable: in-memory state is already cleared.
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="/student-portal/*" element={<StudentPortal />} />

        <Route path="/*" element={
          user ? (
            <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans" dir="rtl">
              <Right />
              <div className="flex-1 overflow-y-auto bg-slate-50 relative">
                <div className="pt-24 lg:pt-12 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-full">
                  <Left />
                </div>
              </div>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </AuthContext.Provider>
  );
}

export { AuthContext };
export default App;
