import React, { useState, useEffect } from "react";
import StudentLogin from "./StudentLogin";
import StudentDashboard from "./StudentDashboard";

function StudentPortal() {
  const [student, setStudent] = useState(() => {
    const saved = sessionStorage.getItem("student_session");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (student) {
      sessionStorage.setItem("student_session", JSON.stringify(student));
    } else {
      sessionStorage.removeItem("student_session");
    }
  }, [student]);

  if (!student) {
    return <StudentLogin onLogin={setStudent} />;
  }

  return <StudentDashboard student={student} onLogout={() => setStudent(null)} />;
}

export default StudentPortal;
