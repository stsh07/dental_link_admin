export type AppointmentDetail = {
  id: number;
  patientName: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  doctor: string;
  date: string;      // YYYY-MM-DD
  timeStart: string; // HH:MM
  service: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED";
};

type Props = {
  open: boolean;
  data: AppointmentDetail | null;
  onClose: () => void;
  onApprove: () => void;
  onDecline: () => void;
  onComplete: () => void;
  actionLoading?: boolean;
};

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
};
const addMinutes = (hhmm: string, mins: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor((total / 60) % 24);
  const mm = total % 60;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
};
const prettyDate = (ymd: string) => {
  const [y,m,d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m||1)-1, d||1));
  return dt.toLocaleDateString(undefined, { year:"numeric", month:"long", day:"2-digit" });
};
const firstNameOf = (full: string) => (full || "").trim().split(/\s+/)[0] || "-";

export default function AppointmentPopup({
  open,
  data,
  onClose,
  onApprove,
  onDecline,
  onComplete,
  actionLoading,
}: Props) {
  if (!open || !data) return null;

  const start = data.timeStart || "00:00";
  const end = addMinutes(start, 120);
  const timeRange = `${to12h(start)} – ${to12h(end)}`;
  const sidebarName = firstNameOf(data.patientName);

  const statusBadge = (() => {
    if (data.status === "CONFIRMED") return "bg-[#CFF7DA] text-[#2BAE66]"; // green
    if (data.status === "PENDING")   return "bg-[#FFF2CC] text-[#F2B705]"; // yellow
    if (data.status === "COMPLETED") return "bg-blue-100 text-blue-600";   // blue
    if (data.status === "DECLINED")  return "bg-red-100 text-red-700";     // red
    return "bg-gray-200 text-gray-700";
  })();

  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
      <div className="w-full max-w-4xl bg-white rounded-xl border border-gray-200 shadow-[0_4px_15px_rgba(0,0,0,0.25)] overflow-hidden flex">
        {/* sidebar */}
        <aside className="bg-[#30b8de] text-white w-64 flex-shrink-0 p-6 flex flex-col items-center">
          <button
            onClick={onClose}
            className="self-start text-white font-semibold text-sm mb-8 hover:opacity-90"
          >
            Close
          </button>

          <div className="mt-6 flex flex-col items-center">
            <div className="w-28 h-28 rounded-full bg-white/95 shadow-inner mb-4" />
            <div className="text-2xl font-bold">{sidebarName}</div>
          </div>
        </aside>

        {/* main */}
        <main className="flex-1 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Patient Details</h2>
          <div className="space-y-1 text-[13px] text-gray-800">
            <div><span className="font-semibold">Full name:</span> {data.patientName || "-"}</div>
            <div><span className="font-semibold">Email:</span> {data.email || "-"}</div>
            <div><span className="font-semibold">Phone:</span> {data.phone || "-"}</div>
            <div><span className="font-semibold">Age:</span> {data.age ?? "-"}</div>
            <div><span className="font-semibold">Gender:</span> {data.gender || "-"}</div>
            <div><span className="font-semibold">Address:</span> {data.address || "-"}</div>
          </div>

          <div className="h-5" />

          <h2 className="text-xl font-bold text-gray-900 mb-4">Appointment Details</h2>
          <div className="space-y-1 text-[13px] text-gray-800">
            <div><span className="font-semibold">Dentist:</span> {data.doctor}</div>
            <div><span className="font-semibold">Procedure:</span> {data.service}</div>
            <div><span className="font-semibold">Date:</span> {prettyDate(data.date)}</div>
            <div><span className="font-semibold">Time:</span> {timeRange}</div>
            <div>
              <span className="font-semibold">Status:</span>{" "}
              <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge}`}>
                {data.status === "CONFIRMED" ? "Approved" :
                 data.status === "PENDING"  ? "Pending"  :
                 data.status === "COMPLETED"? "Completed":
                 "Declined"}
              </span>
            </div>
            {data.notes ? (
              <div className="text-gray-700"><span className="font-semibold">Notes:</span> {data.notes}</div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {data.status === "PENDING" && (
              <>
                <button
                  disabled={actionLoading}
                  onClick={onApprove}
                  className="flex-1 bg-[#2BAE66] hover:bg-[#24985a] disabled:opacity-60 text-white font-semibold py-3 rounded-xl"
                >
                  {actionLoading ? "Working..." : "Approve"}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={onDecline}
                  className="flex-1 bg-[#EF4444] hover:bg-[#d63d3d] disabled:opacity-60 text-white font-semibold py-3 rounded-xl"
                >
                  {actionLoading ? "Working..." : "Decline"}
                </button>
              </>
            )}

            {data.status === "CONFIRMED" && (
              <>
                <button
                  disabled={actionLoading}
                  onClick={onComplete}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl"
                >
                  {actionLoading ? "Working..." : "Completed"}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={onDecline}
                  className="flex-1 bg-[#EF4444] hover:bg-[#d63d3d] disabled:opacity-60 text-white font-semibold py-3 rounded-xl"
                >
                  {actionLoading ? "Working..." : "Decline"}
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
