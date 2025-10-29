// client/components/ActiveAppointments.tsx
import { useEffect, useMemo, useState } from "react";
import { BellIcon, SearchIcon, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import profile from "../assets/profile.svg";
import AppointmentPopup, { AppointmentDetail } from "../popups/AppointmentPopup";

type TabKey = "all" | "pending" | "approved";

type ApiAppointment = {
  id: number;
  patientName: string;
  doctor: string;
  date: string;       // YYYY-MM-DD
  timeStart: string;  // HH:MM
  service: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED";
};

type ApiResponse = { page: number; pageSize: number; total: number; items: any[] };

/* ---------- Time & date helpers ---------- */
const parseHHMM = (val?: string | null): { h: number; m: number } | null => {
  if (!val || typeof val !== "string") return null;
  const m = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]); const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
};
const to12hSafe = (hhmm?: string | null): string => {
  const t = parseHHMM(hhmm);
  if (!t) return "—";
  const am = t.h < 12;
  const h = t.h % 12 || 12;
  return `${h}:${String(t.m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
};
const addMinutesSafe = (hhmm: string | null | undefined, mins: number): string | null => {
  const t = parseHHMM(hhmm);
  if (!t) return null;
  const total = t.h * 60 + t.m + mins;
  const hh = Math.floor(((total % (24 * 60)) + (24 * 60)) % (24 * 60) / 60);
  const mm = ((total % (24 * 60)) + (24 * 60)) % (24 * 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const fmtDatePretty = (ymd?: string | null) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
};

/* ---------- UI helpers ---------- */
const uiStatus = (s: ApiAppointment["status"]) =>
  s === "CONFIRMED" ? "Approved" :
  s === "PENDING"  ? "Pending"  :
  s === "COMPLETED"? "Completed":
                     "Declined";

const badgeClasses = (s: ApiAppointment["status"]) =>
  s === "CONFIRMED" ? "bg-[#CFF7DA] text-[#2BAE66]" :
  s === "PENDING"  ? "bg-[#FFF2CC] text-[#F2B705]"  :
  s === "COMPLETED"? "bg-blue-100 text-blue-600"    :
                     "bg-red-100 text-red-700";

const isActive = (s: ApiAppointment["status"]) => s === "PENDING" || s === "CONFIRMED";

/* ---------- Robust normalizer ---------- */
const normalizeItem = (raw: any): ApiAppointment => {
  const id = Number(raw.id ?? 0);

  const patientName = String(
    raw.patientName ??
    raw.full_name ??
    raw.name ??
    ""
  ).trim();

  const doctor = String(
    raw.doctor ??
    raw.doctorName ??
    raw.dentist ??
    ""
  ).trim();

  const date = String(
    raw.date ??
    raw.preferredDate ??
    ""
  ).slice(0, 10);

  const timeStart = String(
    raw.timeStart ??
    raw.preferredTime ??
    ""
  ).slice(0, 5);

  const service = String(
    raw.service ??
    raw.serviceName ??
    raw.procedureName ??
    raw.procedure ??
    ""
  ).trim();

  const status = (String(raw.status ?? "PENDING").toUpperCase() as ApiAppointment["status"]);
  return { id, patientName, doctor, date, timeStart, service, status };
};

export default function ActiveAppointments(): JSX.Element {
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ApiAppointment[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AppointmentDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const u = new URL("http://localhost:4000/api/admin/appointments");
        u.searchParams.set("page", "1");
        u.searchParams.set("pageSize", "500");
        if (query.trim()) u.searchParams.set("search", query.trim());

        const res = await fetch(u.toString(), { cache: "no-store" });
        const json: ApiResponse = await res.json();
        if (!res.ok || (json as any).error) throw new Error((json as any).error || "load failed");

        if ((json as any)?.items?.length) {
          console.log("Sample admin item:", (json as any).items[0]); // <— temp debug
        }

        setItems((json.items || []).map(normalizeItem));
      } catch (e: any) {
        setError(e?.message || "Failed to load");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [query]);

  const filtered = useMemo(() => {
    const base = items.filter(a => isActive(a.status));
    if (tab === "pending")  return base.filter(a => a.status === "PENDING");
    if (tab === "approved") return base.filter(a => a.status === "CONFIRMED");
    return base;
  }, [items, tab]);

  const fetchDetails = async (id: number): Promise<Partial<AppointmentDetail>> => {
    const res = await fetch(`http://localhost:4000/api/admin/appointments/${id}`, { cache: "no-store" });
    if (!res.ok) return {};
    const j = await res.json();
    return {
      patientName: j.patientName ?? j.full_name ?? "",
      email: j.email ?? null,
      age: j.age ?? null,
      gender: j.gender ?? null,
      phone: j.phone ?? null,
      address: j.address ?? null,
      notes: j.notes ?? null,
      doctor: j.doctor ?? j.doctorName ?? "",
      date: String(j.date ?? j.preferredDate ?? "").slice(0, 10),
      timeStart: String(j.timeStart ?? j.preferredTime ?? "").slice(0, 5),
      service: j.service ?? j.serviceName ?? j.procedureName ?? "",
      status: (String(j.status ?? "PENDING").toUpperCase() as ApiAppointment["status"]),
    };
  };

  const openPopup = async (a: ApiAppointment) => {
    setSelected({
      id: a.id,
      patientName: a.patientName ?? "",
      email: null,
      age: null,
      gender: null,
      phone: null,
      address: null,
      notes: null,
      doctor: a.doctor,
      date: a.date,
      timeStart: a.timeStart,
      service: a.service,
      status: a.status,
    });
    setOpen(true);

    try {
      const detail = await fetchDetails(a.id);
      setSelected(prev => prev ? { ...prev, ...detail } as AppointmentDetail : prev);
    } catch { /* ignore */ }
  };

  const updateStatusLocal = (id: number, status: ApiAppointment["status"]) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it));
    setSelected(prev => prev ? { ...prev, status } : prev);
  };

  const patchStatus = async (id: number, status: ApiAppointment["status"]) => {
    const res = await fetch(`http://localhost:4000/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "update failed");
    }
  };

  const bounceToHistory = () => {
    window.dispatchEvent(new Event("appointments-updated"));
    window.dispatchEvent(new Event("patients-updated"));
    navigate("/appointments/history"); // <-- match your App.tsx route
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await patchStatus(selected.id, "CONFIRMED");
      updateStatusLocal(selected.id, "CONFIRMED");
      window.dispatchEvent(new Event("patients-updated"));
      setOpen(false);
      setSelected(null);
    } catch (e) {
      alert((e as any).message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await patchStatus(selected.id, "DECLINED");
      updateStatusLocal(selected.id, "DECLINED");
      setOpen(false);
      setSelected(null);
      bounceToHistory();
    } catch (e) {
      alert((e as any).message || "Failed to decline");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await patchStatus(selected.id, "COMPLETED");
      updateStatusLocal(selected.id, "COMPLETED");
      setOpen(false);
      setSelected(null);
      bounceToHistory();
    } catch (e) {
      alert((e as any).message || "Failed to complete");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Appointments</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-[320px] h-10 bg-white rounded-full border border-[#d9d9d9] shadow-inner flex items-center px-4">
              <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="border-0 outline-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 h-auto p-0 w-full"
              />
            </div>
            <BellIcon className="w-5 h-5 text-gray-600" />
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-8 pt-4 pb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Active Appointments</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : error ? `Error: ${error}` : `You have ${items.filter(a => isActive(a.status)).length} total active appointments.`}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <button className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium">
                + Add Appointment
              </button>

              <div className="flex items-center gap-5">
                <button
                  onClick={() => setTab("all")}
                  className={`pb-[2px] text-sm font-medium ${tab === "all" ? "text-[#2bacd0] border-b-2 border-[#2bacd0]" : "text-black"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTab("pending")}
                  className={`pb-[2px] text-sm font-medium ${tab === "pending" ? "text-[#2bacd0] border-b-2 border-[#2bacd0]" : "text-black"}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setTab("approved")}
                  className={`pb-[2px] text-sm font-medium ${tab === "approved" ? "text-[#2bacd0] border-b-2 border-[#2bacd0]" : "text-black"}`}
                >
                  Approved
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#c4c4c4] bg-white shadow">
            <div className="p-0 overflow-x-hidden">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[6%]" />
                </colgroup>

                <thead>
                  <tr className="border-b">
                    {["Patient Name","Doctor","Date","Time","Service","Status",""].map((head) => (
                      <th
                        key={head}
                        className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                          head === "Patient Name" ? "pl-8 text-left"
                          : head === "" ? "pr-8 text-right"
                          : "px-4 text-left"
                        }`}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((a) => {
                    const start12 = to12hSafe(a.timeStart);
                    const endHM = addMinutesSafe(a.timeStart, 120);
                    const end12 = endHM ? to12hSafe(endHM) : "—";
                    const timeRange = start12 !== "—" && end12 !== "—" ? `${start12} – ${end12}` : "—";
                    const datePretty = fmtDatePretty(a.date);

                    return (
                      <tr key={a.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 pl-8 font-medium text-gray-900 text-sm">
                          <div className="flex items-center gap-3">
                            <img src={profile} alt={`${a.patientName || "Patient"} profile`} className="w-9 h-9 rounded-full bg-white object-cover" />
                            <span className="truncate">{a.patientName || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{a.doctor || "—"}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{datePretty}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{timeRange}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{a.service || "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center rounded-full min-w-[70px] px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeClasses(a.status)}`}>
                            {uiStatus(a.status)}
                          </span>
                        </td>
                        <td className="py-3 pr-8">
                          <div className="flex justify-end">
                            <button
                              aria-label="Open details"
                              onClick={() => openPopup(a)}
                              className="p-1 rounded hover:bg-gray-100"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {(!loading && !error && filtered.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-gray-500">
                        No appointments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AppointmentPopup
            open={open}
            data={selected}
            onClose={() => setOpen(false)}
            onApprove={handleApprove}
            onDecline={handleDecline}
            onComplete={handleComplete}
            actionLoading={actionLoading}
          />
        </div>
      </main>
    </div>
  );
}
