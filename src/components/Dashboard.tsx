import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import NotificationPopup, { NotificationItem } from "../popups/notification";
import AppointmentPopup, { AppointmentDetail } from "../popups/AppointmentPopup";

import totalPatientIcon from "../assets/total_patient.svg";
import completedIcon from "../assets/completed.svg";
import pendingIcon from "../assets/pending.svg";
import declinedIcon from "../assets/declined.svg";

/* ---------- types ---------- */
type Stats = {
  total: number;
  pending: number;
  confirmed: number;
  declined: number;
  completed: number;
};

type DoctorRow = {
  id: number;
  full_name: string;
  position?: string | null;
  work_time?: string | null;
  patients_today?: number | null;
  status?: string | null;
};

type ApiAppointment = {
  id: number;
  patientName: string;
  doctor: string;
  date: string;
  timeStart: string;
  service: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED" | string;
};

type ApiResponse = { page: number; pageSize: number; total: number; items: any[] };

/** Extend NotificationItem to carry the appointment id */
type NotifWithApptId = NotificationItem & { apptId?: number | null };

const normalize = (s: string) => (s || "").trim().toLowerCase();

const todayYMDManila = (): string => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseHHMM = (val?: string | null) => {
  if (!val || typeof val !== "string") return null;
  const m = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
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
  const hh = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const mm = ((total % (24 * 60)) + 24 * 60) % (24 * 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const fmtDateCompact = (ymd: string): string => {
  const [y, m, d] = ymd.split("-");
  return `${m}.${d}.${String(y).slice(-2)}`;
};

const normalizeItem = (raw: any): ApiAppointment => {
  const id = Number(raw.id ?? 0);
  const patientName = String(raw.patientName ?? raw.full_name ?? raw.name ?? "").trim();
  const doctor = String(raw.doctor ?? raw.doctorName ?? raw.dentist ?? "").trim();
  const date = String(raw.date ?? raw.preferredDate ?? "").slice(0, 10);
  const timeStart = String(raw.timeStart ?? raw.preferredTime ?? "").slice(0, 5);
  const service = String(
    raw.service ?? raw.serviceName ?? raw.procedureName ?? raw.procedure ?? ""
  ).trim();
  const status = String(raw.status ?? "PENDING").toUpperCase() as ApiAppointment["status"];
  return { id, patientName, doctor, date, timeStart, service, status };
};

const Dashboard: React.FC = () => {
  /* ---------- STATS ---------- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState("");

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setStatsErr("");
      const res = await fetch("http://localhost:4002/api/admin/stats", { cache: "no-store" });
      const json: any = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load stats");
      const data = json && typeof json === "object" && "stats" in json ? json.stats : json;
      setStats({
        total: Number(data.total || 0),
        pending: Number(data.pending || 0),
        confirmed: Number(data.confirmed || data.approved || 0),
        completed: Number(data.completed || 0),
        declined: Number(data.declined || 0),
      });
    } catch (e: any) {
      setStatsErr(e?.message || "Failed to load stats");
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);
  useEffect(() => {
    const refresh = () => fetchStats();
    window.addEventListener("appointments-updated", refresh);
    return () => window.removeEventListener("appointments-updated", refresh);
  }, []);

  const approved = stats?.confirmed || 0;
  const completed = stats?.completed || 0;
  const pending = stats?.pending || 0;
  const declined = stats?.declined || 0;

  /* ---------- DOCTORS + TODAY ---------- */
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsErr, setDoctorsErr] = useState("");

  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  const [todaysApproved, setTodaysApproved] = useState<ApiAppointment[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      setDoctorsErr("");
      const res = await fetch("http://localhost:4002/api/doctors", { cache: "no-store" });
      const json: any = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Failed to load doctors");
      setDoctors(json.doctors as DoctorRow[]);
    } catch (e: any) {
      setDoctorsErr(e?.message || "Failed to load doctors");
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchAppointmentsForDashboard = async () => {
    try {
      setCountsLoading(true);
      setTodayLoading(true);
      const u = new URL("http://localhost:4002/api/admin/appointments");
      u.searchParams.set("page", "1");
      u.searchParams.set("pageSize", "500");
      const res = await fetch(u.toString(), { cache: "no-store" });
      const json: ApiResponse | any = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load appointments");

      const items: ApiAppointment[] = (json.items || []).map(normalizeItem);

      const active = items.filter(
        (a) => a.status === "PENDING" || a.status === "CONFIRMED" || a.status === "APPROVED"
      );

      const map: Record<string, number> = {};
      for (const a of active) {
        const key = normalize(a.doctor);
        if (!key) continue;
        map[key] = (map[key] ?? 0) + 1;
      }
      setActiveCounts(map);

      const todayYMD = todayYMDManila();
      const todays = items
        .filter((a) => (a.status === "CONFIRMED" || a.status === "APPROVED") && a.date === todayYMD)
        .sort((a, b) => (a.timeStart < b.timeStart ? -1 : a.timeStart > b.timeStart ? 1 : 0));

      setTodaysApproved(todays);
    } catch {
    } finally {
      setCountsLoading(false);
      setTodayLoading(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([fetchDoctors(), fetchAppointmentsForDashboard()]);
  };

  useEffect(() => {
    loadAll();
  }, []);
  useEffect(() => {
    const refresh = () => loadAll();
    window.addEventListener("appointments-updated", refresh);
    window.addEventListener("doctors-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("appointments-updated", refresh);
      window.removeEventListener("doctors-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const statusClass = (status?: string | null) =>
    status === "At Work"
      ? "text-green-600"
      : status === "Lunch"
      ? "text-orange-500"
      : status === "At Leave"
      ? "text-blue-600"
      : status === "Absent"
      ? "text-gray-600"
      : "text-gray-500";

  const doctorsAtWork = doctors.filter((d) => (d.status || "") === "At Work");

  /* ---------- Top services ---------- */
  const [topServices, setTopServices] = useState<{ name: string; percentage: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("http://localhost:4002/api/admin/top-services", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) {
          setTopServices([]);
          return;
        }
        setTopServices((j.items || []).map((x: any) => ({ name: x.name, percentage: x.percentage })));
      } catch {
        setTopServices([]);
      }
    })();
  }, []);

  /* ---------- Notifications ---------- */
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifWithApptId[]>([]);
  const notifWrapRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = async () => {
    try {
      const r = await fetch("http://localhost:4002/api/notifications?limit=50", { cache: "no-store" });
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

  /* ---------- Appointment popup ---------- */
  const [apptOpen, setApptOpen] = useState(false);
  const [apptData, setApptData] = useState<AppointmentDetail | null>(null);
  const [apptActionLoading, setApptActionLoading] = useState(false);

  const fetchAppointmentDetail = async (id: number): Promise<Partial<AppointmentDetail>> => {
    const res = await fetch(`http://localhost:4002/api/admin/appointments/${id}`, {
      cache: "no-store",
    });
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

  // Accept (notifId, apptId) and use the real apptId
  const handleViewFromNotif = async (notifId: number, apptId?: number | null) => {
    if (!apptId) return;

    setNotifOpen(false);

    // show placeholder while loading details
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
      // mark the notification as read (optional)
      try {
        await fetch(`http://localhost:4002/api/notifications/${notifId}/read`, { method: "PATCH" });
      } catch {}
    } catch {
      /* ignore */
    }
  };

  const patchStatus = async (id: number, status: AppointmentDetail["status"]) => {
    const res = await fetch(`http://localhost:4002/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "update failed");
    }
  };

  const removeNotifForAppt = (apptId: number) => {
    setNotifications((prev) => prev.filter((n) => n.apptId !== apptId));
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

  /* ---------- UI ---------- */
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Dashboard Overview</h1>

          <div ref={notifWrapRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((s) => !s)}
              className="relative p-2 rounded hover:bg-gray-100"
              aria-label="Open notifications"
            >
              <Bell className="w-6 h-6 text-gray-600" />
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

        <div className="flex-1 overflow-y-auto p-6">
          {!!statsErr && <p className="text-sm text-red-600 mb-3">Error: {statsErr}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Approved", value: approved, iconSrc: totalPatientIcon },
              { label: "Completed", value: completed, iconSrc: completedIcon },
              { label: "Pending", value: pending, iconSrc: pendingIcon },
              { label: "Declined", value: declined, iconSrc: declinedIcon },
            ].map((c) => (
              <div key={c.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <img src={c.iconSrc} alt={c.label} className="w-12 h-12 mr-4 object-contain" />
                  <div>
                    <p className="text-sm text-gray-600">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{statsLoading ? "…" : c.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Services</h3>
            <div className="space-y-4">
              {topServices.length === 0 ? (
                <p className="text-sm text-gray-500">No data.</p>
              ) : (
                topServices.map((service, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{service.name}</span>
                      <span className="text-sm text-gray-600">{service.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div className="h-2 rounded bg-blue-500" style={{ width: `${service.percentage}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white px-6 pt-6 pb-2 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Doctors at work</h3>
                {(doctorsLoading || countsLoading) && (
                  <span className="text-xs text-gray-500">Refreshing…</span>
                )}
              </div>

              {!!doctorsErr && <p className="text-sm text-red-600 mb-3">Error: {doctorsErr}</p>}

              {!doctorsLoading && !countsLoading && doctorsAtWork.length === 0 ? (
                <p className="text-sm text-gray-500 mb-3">No doctors are currently at work.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {doctorsAtWork.map((d) => {
                    const count = activeCounts[normalize(d.full_name)] ?? 0;
                    return (
                      <div key={d.id} className="grid grid-cols-3 items-center py-3">
                        <div>
                          <p className="font-medium text-gray-900 leading-6">{d.full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{d.work_time || "08:00 – 17:00"}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{count} patients</p>
                        </div>
                        <div className="text-left">
                          <p className={`text-sm font-medium ${statusClass(d.status)}`}>{d.status || "At Work"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-10">Todays Appointments</h3>

              <div className="grid grid-cols-3 text-sm font-medium text-gray-600 mb-3 px-1">
                <span>Patient</span>
                <span>Date &amp; Time</span>
                <span className="text-left">Treatment type</span>
              </div>

              {todayLoading ? (
                <p className="text-sm text-gray-500 px-1">Loading today’s appointments…</p>
              ) : todaysApproved.length > 0 ? (
                <div className="space-y-3">
                  {todaysApproved.map((a) => {
                    const start12 = to12hSafe(a.timeStart);
                    const endHM = addMinutesSafe(a.timeStart, 120);
                    const end12 = endHM ? to12hSafe(endHM) : "—";
                    const timeRange = start12 !== "—" && end12 !== "—" ? `${start12}` : start12;
                    const dateDisp = fmtDateCompact(a.date);
                    return (
                      <div
                        key={a.id}
                        className="grid grid-cols-3 items-center gap-4 rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3"
                      >
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-900">{a.patientName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{timeRange}</p>
                          <p className="text-xs text-gray-400">{dateDisp}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">{a.service || "—"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment popup */}
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

export default Dashboard;
