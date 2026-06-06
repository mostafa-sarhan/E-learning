import type { RecentMessage as RecentMessageType } from "../../types/whatsapp";

function formatSentAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + " " + d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface Props {
  messages: RecentMessageType[];
  loading: boolean;
}

const messageTypeConfig: Record<
  string,
  { label: string; class: string }
> = {
  attendance: { label: "حضور", class: "bg-blue-50 text-blue-700" },
  absence: { label: "غياب", class: "bg-amber-50 text-amber-700" },
  exam_result: { label: "نتيجة امتحان", class: "bg-purple-50 text-purple-700" },
  payment: { label: "دفع", class: "bg-green-50 text-green-700" },
};

const deliveryStatusConfig: Record<
  string,
  { label: string; icon: string; failed?: boolean }
> = {
  sent: { label: "تم الإرسال", icon: "M12 2l-2 4h-4l-2 4h12l-2-4h-4z" },
  delivered: { label: "تم التوصيل", icon: "M5 13l4 4L19 7" },
  failed: { label: "فشل", icon: "M6 18L18 6M6 6l12 12", failed: true },
};

function MessageTypeBadge({ type }: { type: string }) {
  const config = messageTypeConfig[type] ?? {
    label: type,
    class: "bg-slate-50 text-slate-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${config.class}`}
    >
      {config.label}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const config = deliveryStatusConfig[status] ?? {
    label: status,
    icon: "",
    failed: false,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        config.failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
      </svg>
      {config.label}
    </span>
  );
}

function StudentAvatar({ name }: { name: string }) {
  const initial = name?.charAt(0) || "?";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
      {initial}
    </div>
  );
}

function RecentMessages({ messages, loading }: Props) {
  const hasMessages = messages.length > 0;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              آخر الرسائل
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              أحدث رسائل واتساب المرسلة لأولياء الأمور
            </p>
          </div>
          {!loading && hasMessages && (
            <span className="text-xs text-slate-400">
              {messages.length} رسالة
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">جاري تحميل الرسائل...</p>
          </div>
        </div>
      ) : !hasMessages ? (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-slate-500">لا توجد رسائل متاحة حالياً</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                  اسم الطالب
                </th>
                <th className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                  رقم ولي الأمر
                </th>
                <th className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                  نوع الرسالة
                </th>
                <th className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                  حالة الإرسال
                </th>
                <th className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                  تاريخ الإرسال
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={msg.studentName} />
                      <span className="font-medium text-slate-800">
                        {msg.studentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-slate-600" dir="ltr">
                      {msg.parentPhone}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <MessageTypeBadge type={msg.messageType} />
                  </td>
                  <td className="px-5 py-4">
                    <DeliveryStatusBadge status={msg.deliveryStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatSentAt(msg.sentAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RecentMessages;
