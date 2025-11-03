import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { BellIcon, SearchIcon, ChevronRight } from "lucide-react";
import profile from "../assets/profile.svg";
import PatientsPopup from "../popups/PatientsPopup";
import AppointmentPopup, { AppointmentDetail } from "../popups/AppointmentPopup";
import NotificationPopup, { NotificationItem } from "../popups/notification";

type PatientRow = {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  lastVisit: string;
};

type ApiResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: PatientRow[];
};

/** Extend NotificationItem to carry the appointment id */
type NotifWithApptId = NotificationItem & { apptId?: number | null };

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const prettyDate = (ymd?: string | null) => {
  if (!ymd) return "-";
  const [y, m, d] = (ymd || "").split("-").map(Number);
  const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
};

export default function Patients(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isDetail = !!id;

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setErr("");
    try {
      const u = new URL(`${API_BASE}/api/admin/patients`);
      u.searchParams.set("page", "1");
      u.searchParams.set("pageSize", "1000");
      const res = await fetch(u.toString(), { cache: "no-store", signal: ac.signal });
      const json: ApiResponse = await res.json();
      if (!res.ok) throw new Error((json as any).error || "Failed to load patients");
      setRows(json.items || []);
    } catch (e: unknown) {
      if ((e as any)?.name !== "AbortError") {
        setErr((e as any)?.message || "Failed to load patients");
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDetail) return;
    load();
    return () => abortRef.current?.abort();
  }, [isDetail]);

  useEffect(() => {
    if (isDetail) return;
    const onUpdate = () => load();
    window.addEventListener("patients-updated", onUpdate);
    window.addEventListener("appointments-updated", onUpdate);
    return () => {
      window.removeEventListener("patients-updated", onUpdate);
      window.removeEventListener("appointments-updated", onUpdate);
    };
  }, [isDetail]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p: PatientRow) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const totalPatients = filteredRows.length;

  /* ---------- Notifications (shared UX) ---------- */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifWithApptId[]>([]);
  const notifWrapRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/notifications?limit=50`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setNotifications([]);
        return;
      }
      setNotifications((j.items || []) as NotifWithApptId[]);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const idTimer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(idTimer);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = notifWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const removeNotifForAppt = (apptId: number) => {
    setNotifications((prev) => prev.filter((n) => n.apptId !== apptId));
  };

  /* ---------- Appointment popup & actions (opened from notifications) ---------- */
  const [apptOpen, setApptOpen] = useState(false);
  const [apptData, setApptData] = useState<AppointmentDetail | null>(null);
  const [apptActionLoading, setApptActionLoading] = useState(false);

  const fetchAppointmentDetail = async (apptId: number): Promise<Partial<AppointmentDetail>> => {
    const res = await fetch(`${API_BASE}/api/admin/appointments/${apptId}`, { cache: "no-store" });
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
      status: String(j.status ?? "PENDING").toUpperCase() as AppointmentDetail["status"],
    };
  };

  const patchStatus = async (apptId: number, status: AppointmentDetail["status"]) => {
    const res = await fetch(`${API_BASE}/api/appointments/${apptId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as any).error || "update failed");
    }
  };

  const afterSuccessfulAction = (apptId: number) => {
    removeNotifForAppt(apptId);
    fetchNotifications();
    window.dispatchEvent(new Event("appointments-updated"));
    window.dispatchEvent(new Event("patients-updated"));
  };

  const handleApprove = async () => {
    if (!apptData) return;
    try {
      setApptActionLoading(true);
      await patchStatus(apptData.id, "CONFIRMED");
      setApptOpen(false);
      afterSuccessfulAction(apptData.id);
    } catch (e: unknown) {
      alert((e as any)?.message || "Failed to approve");
    } finally {
      setApptActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!apptData) return;
    try {
      setApptActionLoading(true);
      await patchStatus(apptData.id, "DECLINED");
      setApptOpen(false);
      afterSuccessfulAction(apptData.id);
    } catch (e: unknown) {
      alert((e as any)?.message || "Failed to decline");
    } finally {
      setApptActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!apptData) return;
    try {
      setApptActionLoading(true);
      await patchStatus(apptData.id, "COMPLETED");
      setApptOpen(false);
      afterSuccessfulAction(apptData.id);
    } catch (e: unknown) {
      alert((e as any)?.message || "Failed to complete");
    } finally {
      setApptActionLoading(false);
    }
  };

  // From notifications: open AppointmentPopup and mark-as-read
  const handleViewFromNotif = async (notifId: number, apptId?: number | null) => {
    if (!apptId) return;
    setNotifOpen(false);

    // placeholder while loading details
    setApptData({
      id: apptId,
      patientName: "",
      email: null,
      age: null,
      gender: null,
      phone: null,
      address: null,
      notes: null,
      doctor: "",
      date: "",
      timeStart: "",
      service: "",
      status: "PENDING",
    });
    setApptOpen(true);

    try {
      const detail = await fetchAppointmentDetail(apptId);
      setApptData((prev) => (prev ? ({ ...prev, ...detail } as AppointmentDetail) : prev));
      // best-effort mark-as-read
      try {
        await fetch(`${API_BASE}/api/notifications/${notifId}/read`, { method: "PATCH" });
        removeNotifForAppt(apptId);
      } catch {}
    } catch {}
  };

  /* ---------- Detail route (single patient) ---------- */
  if (isDetail) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
            <h1 className="text-black text-[28px] font-semibold">Patients</h1>
            {/* Notifications in detail page too */}
            <div ref={notifWrapRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((s) => !s)}
                className="relative p-2 rounded hover:bg-gray-100"
                aria-label="Open notifications"
              >
                <BellIcon className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <NotificationPopup
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                items={notifications}
                onView={handleViewFromNotif} // (notifId, apptId)
              />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
            <PatientsPopup patientId={Number(id)} />
          </div>

          {/* Appointment popup (opened from notifications) */}
          <AppointmentPopup
            open={apptOpen}
            data={apptData}
            onClose={() => setApptOpen(false)}
            onApprove={handleApprove}
            onDecline={handleDecline}
            onComplete={handleComplete}
            actionLoading={apptActionLoading}
          />
        </main>
      </div>
    );
  }

  /* ---------- List route ---------- */
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Patients</h1>
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

            {/* Notifications dropdown */}
            <div ref={notifWrapRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((s) => !s)}
                className="relative p-2 rounded hover:bg-gray-100"
                aria-label="Open notifications"
              >
                <BellIcon className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <NotificationPopup
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                items={notifications}
                onView={handleViewFromNotif} // (notifId, apptId)
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Patients List</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : err ? `Error: ${err}` : `You have ${totalPatients} patients.`}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#c4c4c4] bg-white shadow">
            <div className="p-0 overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[8%]" />
                </colgroup>

                <thead>
                  <tr className="border-b">
                    {["Patient", "Age", "Gender", "Email", "Contact", "Last Visit", ""].map((head) => (
                      <th
                        key={head}
                        className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                          head === "Patient" ? "pl-8 text-left" : "px-4 text-left"
                        }`}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((p: PatientRow) => (
                    <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 pl-8 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <img src={profile} alt={`${p.name} profile`} className="w-9 h-9 rounded-full bg-white object-cover" />
                          <span className="truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.age ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.gender ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.email ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.phone ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{prettyDate(p.lastVisit)}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${p.id}`);
                          }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                          aria-label={`View ${p.name} details`}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && !err && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-gray-500">
                        No patients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* End Table */}
        </div>
      </main>

      {/* Appointment popup (opened from notifications) */}
      <AppointmentPopup
        open={apptOpen}
        data={apptData}
        onClose={() => setApptOpen(false)}
        onApprove={handleApprove}
        onDecline={handleDecline}
        onComplete={handleComplete}
        actionLoading={apptActionLoading}
      />
    </div>
  );
}
