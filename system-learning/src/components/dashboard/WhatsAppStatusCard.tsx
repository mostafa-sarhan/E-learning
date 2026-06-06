import { useState } from "react";
import WhatsAppQRCode from "./WhatsAppQRCode";
import type { WhatsAppStatus, QRCodeData } from "../../types/whatsapp";

interface Props {
  status: WhatsAppStatus | null;
  qrCode: QRCodeData | null;
  loading: boolean;
  onEndSession?: () => void;
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        connected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {connected ? "واتساب متصل" : "واتساب غير متصل"}
    </span>
  );
}

function formatConnectionTime(dateStr: string | null): string {
  if (!dateStr) return "---";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function WhatsAppStatusCard({ status, qrCode, loading, onEndSession }: Props) {
  const [ending, setEnding] = useState(false);

  if (loading) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">جاري تحميل حالة الاتصال...</p>
          </div>
        </div>
      </section>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              حالة الاتصال بـ واتساب
            </h2>
            <StatusBadge connected={connected} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {connected
              ? "واتساب متصل وجاهز لإرسال الرسائل"
              : "قم بتوصيل واتساب لبدء إرسال الرسائل لأولياء الأمور"}
          </p>
        </div>
      </div>

      {connected && status ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">
                رقم الهاتف
              </p>
              <p className="text-sm font-bold text-slate-800" dir="ltr">
                {status.phoneNumber}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">
                وقت الاتصال
              </p>
              <p className="text-sm font-bold text-slate-800">
                {formatConnectionTime(status.connectionTime)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">الحالة</p>
              <StatusBadge connected={connected} />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={async () => {
                setEnding(true);
                try {
                  await onEndSession?.();
                } finally {
                  setEnding(false);
                }
              }}
              disabled={ending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {ending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري إنهاء الجلسة...
                </>
              ) : (
                "انهاء الجلسه"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <WhatsAppQRCode qrCode={qrCode} />
        </div>
      )}
    </section>
  );
}

export default WhatsAppStatusCard;
