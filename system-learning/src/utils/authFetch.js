// Attaches the session token to every request sent to the backend API and
// clears the session when the backend rejects it (expired or invalid token).
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function readToken(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || "null")?.token || null;
  } catch {
    return null;
  }
}

function isStudentPortal() {
  return window.location.pathname.startsWith("/student-portal");
}

function currentToken() {
  return isStudentPortal()
    ? readToken(sessionStorage, "student_session")
    : readToken(localStorage, "user");
}

function isApiRequest(url) {
  try {
    const target = new URL(url, window.location.origin);
    const base = new URL(API_BASE, window.location.origin);
    return target.origin === base.origin && target.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url;
    if (!isApiRequest(url)) return originalFetch(input, init);

    const token = currentToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

    const response = await originalFetch(input, { ...init, headers });

    if (response.status === 401 && token && !url.includes("/api/auth/login")) {
      if (isStudentPortal()) {
        sessionStorage.removeItem("student_session");
        window.location.assign("/student-portal");
      } else {
        localStorage.removeItem("user");
        window.location.assign("/login");
      }
    }
    return response;
  };
}
