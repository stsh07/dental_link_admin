import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import {
  Plus,
  Bell as BellIcon,
  Search as SearchIcon,
  Calendar,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Modal from "./modal";
import AddDoctorPopup from "../popups/addDoctor";

import NotificationPopup, { NotificationItem } from "../popups/notification";
import AppointmentPopup, { AppointmentDetail } from "../popups/AppointmentPopup";

/* --------------------------------------------------
   Helpers / Config
-------------------------------------------------- */
function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

type DoctorRow = {
  id: number;
  full_name: string;
  position?: string | null;
  work_time?: string | null;
  status?: "At Work" | "Lunch" | "Absent" | "Leave" | "At Leave" | string | null;
  created_at?: string;
  profile_url?: string | null;
};

function statusClass(status?: string | null) {
  if (status === "At Work") return "text-green-600";
  if (status === "Lunch") return "text-orange-500";
  if (status === "Absent") return "text-gray-600";
  if (status === "At Leave" || status === "Leave") return "text-blue-600";
  return "text-gray-500";
}

function buildPhotoUrl(raw?: string | null) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return `${raw}?t=${Date.now()}`;
  const filename = raw.split(/[/\\]/).pop() || "";
  if (!filename) return null;
  return joinUrl(API_BASE, `/uploads/doctors/${filename}?t=${Date.now()}`);
}

function Avatar({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const src = buildPhotoUrl(photo);
  return (
    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold overflow-hidden border border-blue-200">
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

/** Extend NotificationItem to carry the appointment id */
type NotifWithApptId = NotificationItem & { apptId?: number | null };

const Doctors: React.FC = () => {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  async function loadDoctors(signal?: AbortSignal) {
    const res = await fetch(joinUrl(API_BASE, "/api/doctors"), { signal, cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Load doctors failed");
    return json.doctors as DoctorRow[];
  }

  async function loadActiveCounts(signal?: AbortSignal) {
    const url = joinUrl(API_BASE, "/api/doctors/counts/active");
    const res = await fetch(url, { signal, cache: "no-store" });
    if (!res.ok) return {};
    const json = await res.json();
    return (json.counts || {}) as Record<string, number>;
  }

  async function loadAll() {
    try {
      setLoading(true);
      setErr(null);
      const ctrl = new AbortController();
      const [d, c] = await Promise.all([
        loadDoctors(ctrl.signal),
        loadActiveCounts(ctrl.signal).catch(() => ({})),
      ]);
      setRows(d);
      setCounts(c);
    } catch (e: any) {
      setErr(e?.message || "DB_ERROR");
      setRows([]);
      setCounts({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);
  useEffect(() => {
    const onAppt = () => loadAll();
    const onDocs = () => loadAll();
    window.addEventListener("appointments-updated", onAppt);
    window.addEventListener("doctors-updated", onDocs);
    return () => {
      window.removeEventListener("appointments-updated", onAppt);
      window.removeEventListener("doctors-updated", onDocs);
    };
  }, []);

  // Search by doctor name only (per request)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) => (d.full_name || "").toLowerCase().includes(q));
  }, [rows, query]);

  /* --------------------------------------------------
     Notifications (same pattern as Dashboard/Reviews)
  -------------------------------------------------- */
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
    const id = setInterval(fetchNotifications, 10000);
    return () => clearInterval(id);
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

  /* --------------------------------------------------
     Appointment popup + actions (approve/decline/complete)
  -------------------------------------------------- */
  const [apptOpen, setApptOpen] = useState(false);
  const [apptData, setApptData] = useState<AppointmentDetail | null>(null);
  const [apptActionLoading, setApptActionLoading] = useState(false);

  const removeNotifForAppt = (apptId: number) => {
    setNotifications((prev) => prev.filter((n) => n.apptId !== apptId));
  };

  const fetchAppointmentDetail = async (id: number): Promise<Partial<AppointmentDetail>> => {
    const res = await fetch(`${API_BASE}/api/admin/appointments/${id}`, { cache: "no-store" });
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

  const patchStatus = async (id: number, status: AppointmentDetail["status"]) => {
    const res = await fetch(`${API_BASE}/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "update failed");
    }
  };

  const afterSuccessfulAction = (apptId: number) => {
    setApptOpen(false);
    removeNotifForAppt(apptId);
    window.dispatchEvent(new Event("appointments-updated"));
    window.dispatchEvent(new Event("patients-updated"));
    fetchNotifications();
  };

  const handleApprove = async () => {
    if (!apptData) return;
    try {
      setApptActionLoading(true);
      await patchStatus(apptData.id, "CONFIRMED");
      afterSuccessfulAction(apptData.id);
    } catch (e: any) {
      alert(e?.message || "Failed to approve");
    } finally {
      setApptActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!apptData) return;
    try {
      setApptActionLoading(true);
      await patchStatus(apptData.id, "DECLINED");
      afterSuccessfulAction(apptData.id);
    } catch (e: any) {
      alert(e?.message || "Failed to decline");
    } finally {
      setApptActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!apptData) return;
    try {
      setApptActionLoading(true);
      await patchStatus(apptData.id, "COMPLETED");
      afterSuccessfulAction(apptData.id);
    } catch (e: any) {
      alert(e?.message || "Failed to complete");
    } finally {
      setApptActionLoading(false);
    }
  };

  // Open from notifications
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
      try {
        await fetch(`${API_BASE}/api/notifications/${notifId}/read`, { method: "PATCH" });
        removeNotifForAppt(apptId);
      } catch {}
    } catch {}
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Doctors</h1>

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

            {/* Notifications dropdown (same pattern) */}
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
              <h2 className="text-black text-xl font-semibold leading-tight">Doctors List</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : `You have ${filtered.length} doctors.`}
              </p>
              {err && <p className="text-red-600 text-sm mt-1">{err}</p>}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-[#30B8DE] hover:bg-[#2BACD0] text-white rounded-lg h-9 px-4 text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((doc) => {
              const count = counts[(doc.full_name || "").trim()] ?? 0;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => navigate(`/doctors/${doc.id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left hover:shadow-md hover:border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={doc.full_name} photo={doc.profile_url} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{doc.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{doc.position || "—"}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{doc.work_time || "08:00 – 17:00"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>{count} patients</span>
                    </div>

                    <div className={`mt-1 font-medium ${statusClass(doc.status)}`}>
                      {doc.status || "At Work"}
                    </div>
                  </div>
                </button>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="text-sm text-gray-500">No doctors found.</div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        showDivider={false}
        headerSlot={
          <h1 className="text-[28px] sm:text[32px] font-semibold text-black leading-tight truncate">
            New Doctor
          </h1>
        }
      >
        <AddDoctorPopup />
      </Modal>

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
};

export default Doctors;
