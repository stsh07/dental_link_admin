// src/popups/notification.tsx
import { useMemo } from "react";
import { Bell, X } from "lucide-react";

export type NotificationItem = {
  id: number;              // notification id
  apptId?: number | null;  // appointment id to open
  title: string;
  body: string;
  date: string;
  read: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  onView?: (notifId: number, apptId?: number | null) => void; // pass both ids
};

function whoFromBody(body: string) {
  if (!body) return "";
  const idx = body.toLowerCase().indexOf(" requested");
  if (idx > 0) return body.slice(0, idx).trim();
  const m = body.match(/from\s+(.+?)(?:\s*(?:•|$))/i);
  return m ? m[1].trim() : body.trim();
}

export default function NotificationPopup({ open, onClose, items, onView }: Props) {
  const list = useMemo(
    () =>
      [...(items || [])]
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map((n) => {
          const who = whoFromBody(n.body);
          const line =
            who && /appointment/i.test(n.title)
              ? `New Appointment Request Form from ${who}`
              : n.title || "Notification";
          return { ...n, line };
        }),
    [items]
  );

  if (!open) return null;

  return (
    <div
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-[420px] max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="px-4 py-3 flex items-center justify-between bg-[#30B8DE] text-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-white" />
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10"
          aria-label="Close notifications"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {list.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-gray-500">No notifications.</div>
      ) : (
        <ul className="divide-y">
          {list.map((n) => (
            <li key={n.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 truncate">{n.line}</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onView?.(n.id, n.apptId ?? null);
                  }}
                  className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  View
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
