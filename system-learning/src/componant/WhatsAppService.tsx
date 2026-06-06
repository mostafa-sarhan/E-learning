import { useState, useEffect, useCallback, useRef } from "react";
import WhatsAppStatusCard from "../components/dashboard/WhatsAppStatusCard";
import RecentMessages from "../components/dashboard/RecentMessages";
import type { WhatsAppStatus, QRCodeData, RecentMessage } from "../types/whatsapp";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const POLL_INTERVAL = 5000;

function WhatsAppService() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [messages, setMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp-status`);
      if (res.ok) {
        const data = await res.json();
        setStatus({
          connected: data.connected,
          phoneNumber: data.phoneNumber,
          connectionTime: data.connectionTime,
        });
        setQrCode(data.qrCode ? { qrValue: data.qrCode, expiresIn: 0 } : null);
        setError(null);
      } else {
        setStatus(null);
        setQrCode(null);
      }
    } catch {
      setStatus(null);
      setQrCode(null);
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchMessages();
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, fetchMessages]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            خدمة واتساب
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            إدارة تكامل واتساب لإرسال الإشعارات لأولياء الأمور
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <WhatsAppStatusCard
        status={status}
        qrCode={qrCode}
        loading={loading}
        onEndSession={async () => {
          setError(null);
          const res = await fetch(`${API_BASE}/api/whatsapp/end-session`, { method: "POST" });
          const data = await res.json();
          if (!data.success) {
            setError("فشل إنهاء الجلسة");
          }
        }}
      />

      <RecentMessages messages={messages} loading={loadingMessages} />
    </div>
  );
}

export default WhatsAppService;
