import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import DocApptTable from "../popups/DocApptTable";

type Doctor = {
  id: number;
  full_name: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  address?: string | null;
  phone?: string | null;
  position?: string | null;
  work_time?: string | null;
  status?: string | null;
  patients_today?: number | null;
  created_at?: string;
};

type ApiAppointment = {
  id: number;
  patientName: string;
  doctor: string;
  date: string;      // YYYY-MM-DD
  timeStart: string; // HH:MM
  service: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED";
};

type ActiveRow = {
  patient: string;
  procedure: string;
  date: string;
  time: string;
  status: string;
};

type HistoryRow = {
  patient: string;
  procedure: string;
  date: string;
  time: string;
  review: string; // empty for now
};

const fmtDatePretty = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
};
const to12h = (h24: number, m: number) => {
  const am = h24 < 12;
  const h = h24 % 12 || 12;
  const mm = String(m).padStart(2, "0");
  return `${h}:${mm} ${am ? "AM" : "PM"}`;
};
const addMinutes = (hhmm: string, mins: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor((total / 60) % 24);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

// Allowed status choices (no "Off")
const STATUS_OPTIONS = ["At Work", "Lunch", "Absent", "At Leave"] as const;
type UiStatus = typeof STATUS_OPTIONS[number];

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Tabs
  const [tab, setTab] = useState<"active" | "history">("active");

  // Table rows
  const [activeRows, setActiveRows] = useState<ActiveRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);

  // Status dropdown saving state
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) {
        setErr("Missing doctor id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);
        // Load doctor
        const res = await fetch(`http://localhost:4000/api/doctors/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Load failed");
        if (mounted) setDoctor(json.doctor);

        // Load appointments (filter by this doctor's name)
        const apptRes = await fetch(
          `http://localhost:4000/api/admin/appointments?doctor=${encodeURIComponent(
            json.doctor.full_name
          )}&page=1&pageSize=200`,
          { cache: "no-store" }
        );
        const apptJson = await apptRes.json();
        if (!apptRes.ok) throw new Error(apptJson?.error || "Load appointments failed");

        const items: ApiAppointment[] = apptJson.items || [];

        const act: ActiveRow[] = [];
        const hist: HistoryRow[] = [];

        for (const a of items) {
          if ((a.doctor || "") !== json.doctor.full_name) continue;

          const [sh, sm] = a.timeStart.split(":").map(Number);
          const start12 = to12h(sh, sm);
          const endHM = addMinutes(a.timeStart, 120);
          const [eh, em] = endHM.split(":").map(Number);
          const end12 = to12h(eh, em);

          const rowBase = {
            patient: a.patientName,
            procedure: a.service,
            date: fmtDatePretty(a.date),
            time: `${start12} – ${end12}`,
          };

          if (a.status === "PENDING" || a.status === "CONFIRMED") {
            act.push({ ...rowBase, status: a.status === "CONFIRMED" ? "Approved" : "Pending" });
          } else if (a.status === "COMPLETED") {
            hist.push({ ...rowBase, review: "" }); // Review blank for now
          }
        }

        if (mounted) {
          setActiveRows(act);
          setHistoryRows(hist);
        }
      } catch (e: any) {
        if (mounted) setErr(e.message || "Load failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const statusColor =
    (doctor?.status || "At Work") === "At Work"
      ? "bg-green-100 text-green-700"
      : (doctor?.status || "") === "Lunch"
      ? "bg-orange-100 text-orange-700"
      : (doctor?.status || "") === "At Leave"
      ? "bg-blue-100 text-blue-700"
      : (doctor?.status || "") === "Absent"
      ? "bg-gray-200 text-gray-700"
      : "bg-gray-100 text-gray-600";

  const updateStatus = async (newStatus: UiStatus) => {
    if (!doctor) return;
    try {
      setStatusSaving(true);
      const res = await fetch(`http://localhost:4000/api/doctors/${doctor.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Update failed");
      setDoctor((d) => (d ? { ...d, status: newStatus } : d));
      // let other pages refresh on focus (Doctors, Dashboard)
      window.dispatchEvent(new Event("appointments-updated"));
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const deleteDoctor = async () => {
    if (!doctor) return;
    if (!confirm("Delete this doctor? This will remove them from the doctors list.")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/doctors/${doctor.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Delete failed");
      navigate("/doctors");
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Doctor Profile</h1>
          <div />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pt-6 pb-10">
          <div className="max-w-5xl mx-auto bg-white rounded-lg border border-gray-200 shadow-[0_4px_15px_1px_rgba(0,0,0,0.08)] p-6 sm:p-8 lg:p-12">
            {/* Back */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 mb-6 sm:mb-8 hover:opacity-70 transition-opacity"
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.99888 1.1417L6.81983 8.35263e-05L0.332443 6.15361C0.227873 6.25221 0.144677 6.36968 0.0876438 6.49925C0.0306108 6.62882 0.000866405 6.76794 0.000122491 6.9086C-0.000621422 7.04926 0.0276498 7.18869 0.0833092 7.31885C0.138969 7.44902 0.220917 7.56736 0.324439 7.66706L6.74636 13.8921L7.9363 12.763L1.90887 6.9203L7.99888 1.1417Z" fill="black" />
              </svg>
              <span className="text-base font-semibold">Back</span>
            </button>

            {loading && <p className="text-sm text-gray-600">Loading…</p>}
            {err && <p className="text-sm text-red-600">Error: {err}</p>}

            {doctor && (
              <>
                {/* Profile row */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8 sm:mb-10">
                  <div className="flex justify-center lg:justify-start">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600">
                      {doctor.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 sm:gap-y-6">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Full name</div>
                      <div className="text-sm sm:text-[15px] font-semibold text-gray-900">
                        {doctor.full_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Age</div>
                      <div className="text-sm sm:text-[15px] font-semibold text-gray-900">
                        {doctor.age ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Gender</div>
                      <div className="text-sm sm:text-[15px] font-semibold text-gray-900">
                        {doctor.gender ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Email</div>
                      <div className="text-[11px] font-semibold text-gray-900 break-all">
                        {doctor.email ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Address</div>
                      <div className="text-[11px] font-semibold text-gray-900">
                        {doctor.address ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Phone</div>
                      <div className="text-[11px] font-semibold text-gray-900">
                        {doctor.phone ?? "—"}
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Position</div>
                      <div className="text-[11px] font-semibold text-gray-900">
                        {doctor.position ?? "—"}
                      </div>
                    </div>

                    {/* Working hours + status (dropdown) */}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="flex flex-col gap-2 text-sm">
                        <span className="font-semibold text-gray-900">
                          {doctor.work_time || "08:00 – 17:00"}
                        </span>

                        {/* Status pill dropdown — width 110px, no "Off" */}
                        <div className="relative">
                          <details className="group inline-block">
                            <summary
                              className={`list-none cursor-pointer select-none inline-flex items-center justify-between gap-2 px-2 py-1 rounded font-semibold ${statusColor}`}
                              style={{ width: 110, height: 30 }}
                            >
                              <span className="truncate">{statusSaving ? "Saving…" : (doctor.status || "At Work")}</span>
                              {/* caret on the right inside the pill */}
                              <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </summary>

                            {/* dropdown menu (same width as header) */}
                            <div
                              className="absolute z-20 mt-1 rounded-md border border-gray-200 bg-white shadow-md overflow-hidden"
                              style={{ width: 110 }}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                                    await updateStatus(opt);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <button
                        onClick={deleteDoctor}
                        className="px-6 py-2 bg-red-600 text-white text-[11px] font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete doctor
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                  <div className="flex gap-2 bg-gray-100 rounded-md p-1 inline-flex">
                    <button
                      onClick={() => setTab("active")}
                      className={`px-4 py-2 text-[11px] font-semibold rounded transition-colors ${
                        tab === "active" ? "bg-white text-[#2bacd0]" : "text-gray-500"
                      }`}
                    >
                      Active Appointment
                    </button>
                    <button
                      onClick={() => setTab("history")}
                      className={`px-4 py-2 text-[11px] font-semibold rounded transition-colors ${
                        tab === "history" ? "bg-white text-[#2bacd0]" : "text-gray-500"
                      }`}
                    >
                      Appointment History
                    </button>
                  </div>
                </div>

                {/* Table */}
                <DocApptTable tab={tab} activeData={activeRows} historyData={historyRows} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
