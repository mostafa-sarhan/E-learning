import { QRCodeSVG } from "qrcode.react";
import type { QRCodeData } from "../../types/whatsapp";
import { useState } from "react";

interface Props {
  qrCode: QRCodeData | null;
  onGenerateQR?: () => void;
}

function WhatsAppQRCode({ qrCode, onGenerateQR }: Props) {
  const [generating, setGenerating] = useState(false);

  if (!qrCode || !qrCode.qrValue) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center">
          <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <p className="mt-4 text-sm text-slate-500 text-center">
          لا يوجد رمز QR متاح حالياً
        </p>
        <button
          onClick={async () => {
            setGenerating(true);
            try {
              await onGenerateQR?.();
            } finally {
              setGenerating(false);
            }
          }}
          disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            "انشاء QR"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <QRCodeSVG
          value={qrCode.qrValue}
          size={200}
          bgColor="#ffffff"
          fgColor="#1e293b"
          level="M"
          includeMargin
        />
      </div>
      <p className="mt-4 text-sm text-slate-500 text-center leading-relaxed max-w-xs">
        قم بمسح رمز QR هذا باستخدام واتساب لتوصيل حسابك
      </p>
      {qrCode.expiresIn > 0 && (
        <p className="mt-2 text-xs text-slate-400 dir-ltr" dir="ltr">
          ينتهي الرمز بعد {Math.floor(qrCode.expiresIn / 60)}:
          {String(qrCode.expiresIn % 60).padStart(2, "0")} دقيقة
        </p>
      )}
    </div>
  );
}

export default WhatsAppQRCode;
