import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { BellIcon, SearchIcon, Plus, Trash2, Calendar, Stethoscope } from "lucide-react";

// Local assets
import dentalBraces from "../assets/dentalBraces.svg";
import cleaning from "../assets/cleaning.svg";
import rootCCanal from "../assets/rootCCanal.svg";
import toothExtraction from "../assets/toothExtraction.svg";
import dentalConsultation from "../assets/dentalConsultation.svg";
import toothFilling from "../assets/toothFilling.svg";

// Popups
import DeleteService from "../popups/deleteService";
import AddService from "../popups/addService";
import AppointmentPopup, { AppointmentDetail } from "../popups/AppointmentPopup";
import NotificationPopup, { NotificationItem } from "../popups/notification";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

type Service = {
  id: number;
  name: string;
  description: string;
  appointments: number;
  image: string;
};

/** Extend NotificationItem to carry the appointment id */
type NotifWithApptId = NotificationItem & { apptId?: number | null };

const IMAGE_MAP: Record<string, string> = {
  "dentalBraces.svg": dentalBraces,
  dentalBraces: dentalBraces,
  "cleaning.svg": cleaning,
  cleaning: cleaning,
  "rootCCanal.svg": rootCCanal,
  rootCCanal: rootCCanal,
  "toothExtraction.svg": toothExtraction,
  toothExtraction: toothExtraction,
  "dentalConsultation.svg": dentalConsultation,
  dentalConsultation: dentalConsultation,
  "toothFilling.svg": toothFilling,
  toothFilling: toothFilling,
};

const Services: React.FC = () => {
  /* ---------------- Services data ---------------- */
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);

  const [query, setQuery] = useState("");

  const toService = (svc: any): Service => {
    const img = svc.image_url?.toString()?.trim() || "";
    let imgSrc = dentalConsultation;
    if (img.includes("/")) {
      imgSrc = `${API_BASE}/uploads/${img}`;
    } else if (img) {
      imgSrc = IMAGE_MAP[img] || dentalConsultation;
    }
    return {
      id: svc.id,
      name: svc.name,
      description: svc.description || "",
      appointments: 0,
      image: imgSrc,
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/services`, { credentials: "include", cache: "no-store" });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to fetch");
        const items: Service[] = (json.data || []).map(toService);
        setServices(items);
        setError("");
      } catch (e: any) {
        setError(e.message || "Failed to load services");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalServices = services.length;
    const totalAppointments = services.reduce((acc, s) => acc + (s.appointments || 0), 0);
    return [
      { label: "Total Services", value: totalServices.toString(), icon: Stethoscope },
      { label: "Active Appointments", value: totalAppointments.toString(), icon: Calendar },
    ];
  }, [services]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => (s.name || "").toLowerCase().includes(q)); // search by service name only
  }, [services, query]);

  const handleDeleteClick = (service: Service) => {
    setDeleteTargetId(service.id);
    setDeleteTargetName(service.name);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId == null) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/services/${deleteTargetId.toString()}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to delete service");
      setServices((prev) => prev.filter((s) => s.id !== deleteTargetId));
      setDeleteOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
    } catch (e: any) {
      alert(e.message || "Failed to delete service");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetName("");
  };

  const handleAddCreated = (svc: any) => {
    const newSvc = toService(svc);
    setServices((prev) => [...prev, newSvc]);
  };

  /* ---------------- Notifications + Appointment-popup (same UX as Dashboard/Active/Patients) ---------------- */
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

  const removeNotifForAppt = (apptId: number) => {
    setNotifications((prev) => prev.filter((n) => n.apptId !== apptId));
  };

  /* Appointment popup */
  const [apptOpen, setApptOpen] = useState(false);
  const [apptData, setApptData] = useState<AppointmentDetail | null>(null);
  const [apptActionLoading, setApptActionLoading] = useState(false);

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

  // From notifications: open AppointmentPopup & mark-as-read
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
      try {
        await fetch(`${API_BASE}/api/notifications/${notifId}/read`, { method: "PATCH" });
        removeNotifForAppt(apptId);
      } catch {}
    } catch {}
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Services</h1>
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

            {/* Notifications dropdown (same behavior as Dashboard/Active/Patients) */}
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

        <div className="flex-1 overflow-y-auto px-8 pt-5 pb-8">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Services Management</h2>
              <p className="text-sm text-gray-600 mt-1">Manage your dental services and appointments</p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-cyan-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(48, 184, 222, 0.3)" }}>
                    <stat.icon className="w-6 h-6" style={{ color: "#3165DC" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading ? <p className="text-gray-500 text-sm">Loading services…</p> : error ? <p className="text-red-500 text-sm">{error}</p> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((service) => (
              <div key={service.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-64 overflow-hidden bg-gray-100">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{service.appointments} appointments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteClick(service)}
                        className="p-2 text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!loading && filtered.length === 0 ? (
              <p className="text-gray-500 text-sm">No services found.</p>
            ) : null}
          </div>
        </div>
      </main>

      {/* Modals */}
      <DeleteService
        open={deleteOpen}
        serviceName={deleteTargetName}
        loading={deleteLoading}
        onYes={handleConfirmDelete}
        onNo={handleCancelDelete}
      />

      <AddService open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleAddCreated} />

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

export default Services;
