import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './Home'
import Students from './Students'
import Groups from './Groups'
import Schedule from './Schedule'
import Attendance from './Attendance'
import Exams from './Exams'
import NewStudent from './NewStudent'
import Accounting from './Accounting'
import AdminUsers from './AdminUsers'
import StudentAccounts from './StudentAccounts'
import LecturesAdmin from './LecturesAdmin'
import StudentReport from './StudentReport'
import { AuthContext } from '../App'
import StudentProgressReport from './StudentProgressReport'
import StudentPortal from './StudentPortal'
import WhatsAppService from './WhatsAppService'

function Left() {
  const { user } = useContext(AuthContext);

  if (user?.role === "student") {
    return (
      <Routes>
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="*" element={<Navigate to="/student-portal" />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<Home />} />
      <Route path="/students" element={<Students />} />
      <Route path="/groups" element={<Groups />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/exams" element={<Exams />} />
      <Route path="/new-student" element={<NewStudent />} />
      <Route path="/accounting" element={user?.role === "admin" ? <Accounting /> : <Navigate to="/" />} />
      <Route path="/admin-users" element={<AdminUsers />} />
      <Route path="/student-accounts" element={user?.role === "admin" ? <StudentAccounts /> : <Navigate to="/" />} />
      <Route path="/lectures" element={<LecturesAdmin />} />
      <Route path="/student-report" element={<StudentReport />} />
      <Route path="/student-progress-report" element={<StudentProgressReport />} />
      <Route path="/student-progress" element={<StudentProgressReport />} />
      <Route path="/whatsapp-service" element={<WhatsAppService />} />
    </Routes>
  )
}

export default Left
