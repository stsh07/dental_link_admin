import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { BellIcon, FileText, Calendar, Search, Filter } from "lucide-react";
import profile from "../assets/profile.svg";

import NotificationPopup, { NotificationItem } from "../popups/notification";
import AppointmentPopup, { AppointmentDetail } from "../popups/AppointmentPopup";

interface ApiReview {
  id: number;
  appointmentId: number;
  dentistId: number;
  userEmail: string;
  reviewText: string;
  createdAt: string;
  patientName?: string | null;
  doctorName?: string | null;
}

interface Review {
  customer_name: string;
  doctor: string;
  review_text: string;
  review_date: string;
}

/** Extend NotificationItem to carry the appointment id */
type NotifWithApptId = NotificationItem & { apptId?: number | null };

// change this if your API is on a different port
const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const Reviews = (): JSX.Element => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");

  /* --------------------------------------------------
     1) fetch reviews from backend
  -------------------------------------------------- */
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reviews`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Failed to fetch /api/reviews", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (data.ok && Array.isArray(data.reviews)) {
          // map API shape to UI shape
          const mapped: Review[] = data.reviews.map((r: ApiReview) => ({
            customer_name:
              r.patientName && r.patientName.trim().length > 0 ? r.patientName : r.userEmail,
            doctor:
              r.doctorName && r.doctorName.trim().length > 0
                ? r.doctorName
                : `Doctor #${r.dentistId}`,
            review_text: r.reviewText,
            review_date: r.createdAt,
          }));

          setReviews(mapped);
          setFilteredReviews(mapped);
        } else {
          setReviews([]);
          setFilteredReviews([]);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  /* --------------------------------------------------
     2) re-filter whenever search/doctor/reviews changes
  -------------------------------------------------- */
  useEffect(() => {
    let filtered = [...reviews];
    const q = searchTerm.trim().toLowerCase();

    if (q) {
      filtered = filtered.filter(
        (r) =>
          (r.customer_name || "").toLowerCase().includes(q) ||
          (r.review_text || "").toLowerCase().includes(q) ||
          (r.doctor || "").toLowerCase().includes(q)
      );
    }

    if (selectedDoctor !== "all") {
      filtered = filtered.filter((r) => r.doctor === selectedDoctor);
    }

    setFilteredReviews(filtered);
  }, [reviews, searchTerm, selectedDoctor]);

  const formatDate = (dateString: string) => {
    // MySQL DATETIME → JS Date
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      // fallback if it's e.g. "2025-10-31 14:31:26"
      return dateString;
    }
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // stats
  const stats = useMemo(
    () => [
      { label: "Total Reviews", value: reviews.length.toString(), icon: FileText },
      {
        label: "Latest Review",
        value:
          reviews.length > 0
            ? formatDate(
                [...reviews].sort(
                  (a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
                )[0].review_date
              )
            : "N/A",
        icon: Calendar,
      },
    ],
    [reviews]
  );

  // dynamic doctor list from data
  const doctorList = useMemo(
    () => ["all", ...Array.from(new Set(reviews.map((r) => r.doctor).filter(Boolean)))],
    [reviews]
  );

  /* --------------------------------------------------
     Notifications + AppointmentPopup (same UX)
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

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-gray-600 font-medium">Loading reviews...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Doctor Reviews</h1>

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
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-cyan-400"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>

                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: "rgba(48, 184, 222, 0.3)" }}
                    >
                      <stat.icon className="w-6 h-6" style={{ color: "#3165DC" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + Filter */}
            <div className="bg-white rounded-lg border border-[#c4c4c4] shadow p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by patient name, review content, or doctor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                  />
                </div>
                <div className="relative min-w-[220px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none appearance-none bg-white"
                  >
                    {doctorList.map((doctor) => (
                      <option key={doctor} value={doctor}>
                        {doctor === "all" ? "All Doctors" : doctor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-[#c4c4c4] bg-white shadow">
              <div className="p-0 overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[45%]" />
                    <col className="w-[17%]" />
                  </colgroup>

                  <thead>
                    <tr className="border-b">
                      {["Patient Name", "Doctor", "Review", "Date"].map((head) => (
                        <th
                          key={head}
                          className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                            head === "Patient Name" ? "pl-8 text-left" : "px-4 text-left"
                          }`}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredReviews.map((r, i) => (
                      <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 pl-8 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            <img
                              src={profile}
                              alt={`${r.customer_name} profile`}
                              className="w-9 h-9 rounded-full bg-white object-cover"
                            />
                            <span className="truncate">{r.customer_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{r.doctor}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{r.review_text}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">
                          {formatDate(r.review_date)}
                        </td>
                      </tr>
                    ))}

                    {filteredReviews.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No reviews found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* End Table */}
          </div>
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
};

export default Reviews;
