import { useState, createContext } from 'react';
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

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user') || 'null');
      // Sessions saved before token auth existed are no longer valid.
      return saved?.token ? saved : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </AuthContext.Provider>
  );
}

export { AuthContext };
export default App;
