import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import DocApptTable from "../popups/DocApptTable";
import ReviewPopup from "../popups/reviewspopup";
import DeleteDoctor from "../popups/deleteDoctor";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString() || "http://localhost:4002";

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
  profile_url?: string | null;
};

type ActiveRow = {
  patient: string;
  procedure: string;
  date: string;
  time: string;
  status: "Approved" | "Pending";
};

type HistoryRow = {
  patient: string;
  procedure: string;
  date: string;
  time: string;
  review: string;
};

type NormalizedAppt = {
  id: number | null;
  appointmentId: number | null;
  patient: string;
  procedure: string;
  date: string;
  time: string;
  status: string;
  review: string;
};

type DentistReview = {
  id: number;
  appointmentId: number;
  reviewText: string;
  createdAt: string;
  patientName?: string | null;
  userEmail?: string | null;
};

const fmtDatePretty = (ymd: string) => {
  if (!ymd) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
  }
  return String(ymd);
};

const to12h = (h24: number, m: number) => {
  const am = h24 < 12;
  const h = h24 % 12 || 12;
  const mm = String(m).padStart(2, "0");
  return `${h}:${mm} ${am ? "AM" : "PM"}`;
};

const addMinutes = (hhmm: string, mins: number) => {
  const [h, m] = hhmm.split(":").map((n) => Number(n || 0));
  const total = h * 60 + m + mins;
  const hh = Math.floor((total / 60) % 24);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const STATUS_OPTIONS = ["At Work", "Lunch", "Absent", "At Leave"] as const;

function buildPhotoUrl(raw?: string | null) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return `${raw}?t=${Date.now()}`;
  const filename = raw.split(/[/\\]/).pop() || "";
  if (!filename) return null;
  return joinUrl(API_BASE, `/uploads/doctors/${filename}?t=${Date.now()}`);
}

function pickFirst<T = any>(obj: any, names: string[], fallback: T): T {
  for (const n of names) {
    const v = obj?.[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T;
  }
  return fallback;
}

function normalizeAppt(a: any): NormalizedAppt {
  const patient = pickFirst<string>(a, ["patient_name", "patientName", "patient", "full_name"], "");
  const procedure = pickFirst<string>(a, ["service", "procedure"], "");
  const dateRaw = pickFirst<string>(a, ["date", "appointment_date", "preferredDate"], "");
  const timeRaw = pickFirst<string>(a, ["time_start", "timeStart", "preferredTime", "time"], "");
  const status = String(pickFirst<string>(a, ["status"], "")).toUpperCase();

  const apptIdRaw = pickFirst<string | number>(a, ["appointment_id", "appointmentId", "id"], 0);
  const apptIdNum = Number(apptIdRaw) || null;

  let time = "";
  if (/^\d{1,2}:\d{2}$/.test(String(timeRaw))) {
    const [sh, sm] = String(timeRaw).split(":").map((n) => Number(n || 0));
    const start12 = to12h(sh, sm);
    const endHM = addMinutes(`${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`, 120);
    const [eh, em] = endHM.split(":").map((n) => Number(n || 0));
    const end12 = to12h(eh, em);
    time = `${start12} – ${end12}`;
  } else {
    time = String(timeRaw || "");
  }

  return {
    id: apptIdNum,
    appointmentId: apptIdNum,
    patient,
    procedure,
    date: fmtDatePretty(String(dateRaw || "")),
    time,
    status,
    review: String(pickFirst<string>(a, ["review"], "")),
  };
}

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"active" | "history">("active");
  const [activeRows, setActiveRows] = useState<ActiveRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [statusSaving, setStatusSaving] = useState(false);

  // reviews modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<{ patient: string; review: string } | null>(null);

  // delete-confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

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

        const res = await fetch(joinUrl(API_BASE, `/api/doctors/${id}`), { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Load failed");
        if (mounted) setDoctor(json.doctor);

        const [respA, respH, respR] = await Promise.all([
          fetch(joinUrl(API_BASE, `/api/doctors/${id}/appointments?scope=active`), { cache: "no-store" }),
          fetch(joinUrl(API_BASE, `/api/doctors/${id}/appointments?scope=history`), { cache: "no-store" }),
          fetch(joinUrl(API_BASE, `/api/reviews/by-dentist/${id}`), { cache: "no-store" }),
        ]);

        const [jsonA, jsonH, jsonR] = await Promise.all([respA.json(), respH.json(), respR.json()]);

        if (!respA.ok || !jsonA.ok) throw new Error(jsonA?.error || "Load appointments failed");
        if (!respH.ok || !jsonH.ok) throw new Error(jsonH?.error || "Load appointments failed");
        if (!respR.ok || !jsonR.ok) throw new Error(jsonR?.error || "Load dentist reviews failed");

        const normActive: NormalizedAppt[] = (jsonA.items || []).map((a: any) => normalizeAppt(a));
        const normHistory: NormalizedAppt[] = (jsonH.items || []).map((a: any) => normalizeAppt(a));

        const reviewMap: Record<number, string> = {};
        (jsonR.reviews || []).forEach((r: DentistReview) => {
          if (r.appointmentId) reviewMap[r.appointmentId] = r.reviewText;
        });

        const activeOnly: ActiveRow[] = normActive
          .filter((row) => row.status === "CONFIRMED" || row.status === "PENDING")
          .map((row) => ({
            patient: row.patient,
            procedure: row.procedure,
            date: row.date,
            time: row.time,
            status: row.status === "CONFIRMED" ? "Approved" : "Pending",
          }));

        const historyOnly: HistoryRow[] = normHistory
          .filter((row) => row.status === "COMPLETED" || row.status === "DECLINED")
          .map((row) => {
            const cleanApptId = row.appointmentId ?? row.id ?? -1;
            const fromReviewTable = cleanApptId !== -1 ? reviewMap[cleanApptId] : "";
            return {
              patient: row.patient,
              procedure: row.procedure,
              date: row.date,
              time: row.time,
              review: fromReviewTable || row.review || "",
            };
          });

        if (mounted) {
          setActiveRows(activeOnly);
          setHistoryRows(historyOnly);
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

  const openDeleteModal = () => {
    setDeleteErr(null);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!doctor) return;
    try {
      setDeleting(true);
      setDeleteErr(null);
      const res = await fetch(joinUrl(API_BASE, `/api/doctors/${doctor.id}`), { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `Delete failed (HTTP ${res.status})`);
      window.dispatchEvent(new Event("doctors-updated"));
      setConfirmOpen(false);
      navigate("/doctors");
    } catch (e: any) {
      setDeleteErr(e?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!deleting) setConfirmOpen(false);
  };

  const photo = useMemo(() => buildPhotoUrl(doctor?.profile_url), [doctor?.profile_url]);

  const handleReviewClick = (payload: {
    patient: string;
    review: string;
    date?: string;
    time?: string;
    procedure?: string;
  }) => {
    setSelectedReview({ patient: payload.patient, review: payload.review });
    setReviewModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Doctor Profile</h1>
          <div />
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-6 pb-10">
          <div className="max-w-5xl mx-auto bg-white rounded-lg border border-gray-200 shadow-[0_4px_15px_1px_rgba(0,0,0,0.08)] p-6 sm:p-8 lg:p-12">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 mb-6 sm:mb-8 hover:opacity-70 transition-opacity"
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M7.99888 1.1417L6.81983 8.35263e-05L0.332443 6.15361C0.227873 6.25221 0.144677 6.36968 0.0876438 6.49925C0.0306108 6.62882 0.000866405 6.76794 0.000122491 6.9086C-0.000621422 7.04926 0.0276498 7.18869 0.0833092 7.31885C0.138969 7.44902 0.220917 7.56736 0.324439 7.66706L6.74636 13.8921L7.9363 12.763L1.90887 6.9203L7.99888 1.1417Z"
                  fill="black"
                />
              </svg>
              <span className="text-base font-semibold">Back</span>
            </button>

            {loading && <p className="text-sm text-gray-600">Loading…</p>}
            {err && <p className="text-sm text-red-600">Error: {err}</p>}

            {doctor && (
              <>
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8 sm:mb-10">
                  <div className="flex justify-center lg:justify-start">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 overflow-hidden border border-gray-300">
                      {photo ? (
                        <img
                          src={photo}
                          alt={doctor.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        doctor.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      )}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 sm:gap-y-6">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Full name</div>
                      <div className="text-sm sm:text-[15px] font-semibold text-gray-900">{doctor.full_name}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Age</div>
                      <div className="text-sm sm:text-[15px] font-semibold text-gray-900">{doctor.age ?? "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Gender</div>
                      <div className="text-sm sm:text-[15px] font-semibold text-gray-900">{doctor.gender ?? "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Email</div>
                      <div className="text-[11px] font-semibold text-gray-900 break-all">{doctor.email ?? "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Address</div>
                      <div className="text-[11px] font-semibold text-gray-900">{doctor.address ?? "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Phone</div>
                      <div className="text-[11px] font-semibold text-gray-900">{doctor.phone ?? "—"}</div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Position</div>
                      <div className="text-[11px] font-semibold text-gray-900">{doctor.position ?? "—"}</div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="flex flex-col gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{doctor.work_time || "08:00 – 17:00"}</span>

                        <div className="relative">
                          <details className="group inline-block">
                            <summary
                              className={`list-none cursor-pointer select-none inline-flex items-center justify-between gap-2 px-2 py-1 rounded font-semibold ${
                                (doctor?.status || "At Work") === "At Work"
                                  ? "bg-green-100 text-green-700"
                                  : (doctor?.status || "") === "Lunch"
                                  ? "bg-orange-100 text-orange-700"
                                  : (doctor?.status || "") === "At Leave"
                                  ? "bg-blue-100 text-blue-700"
                                  : (doctor?.status || "") === "Absent"
                                  ? "bg-gray-200 text-gray-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                              style={{ width: 110, height: 30 }}
                            >
                              <span className="truncate">
                                {statusSaving ? "Saving…" : doctor?.status || "At Work"}
                              </span>
                              <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </summary>

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

                                    setStatusSaving(true);
                                    try {
                                      const res = await fetch(
                                        joinUrl(API_BASE, `/api/doctors/${doctor!.id}/status`),
                                        {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ status: opt }),
                                        }
                                      );
                                      const j = await res.json().catch(() => ({}));
                                      if (!res.ok || !j.ok) throw new Error(j.error || "Update failed");
                                      setDoctor((d) => (d ? { ...d, status: opt } : d));
                                      window.dispatchEvent(new Event("appointments-updated"));
                                      window.dispatchEvent(new Event("doctors-updated"));
                                    } catch (error: any) {
                                      alert(error?.message || "Failed to update status");
                                    } finally {
                                      setStatusSaving(false);
                                    }
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
                      {deleteErr && (
                        <div className="mb-2 text-[12px] text-red-600 font-medium">Delete error: {deleteErr}</div>
                      )}
                      <button
                        onClick={openDeleteModal}
                        className="px-6 py-2 bg-red-600 text-white text-[11px] font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                        disabled={deleting}
                      >
                        {deleting ? "Deleting…" : "Delete doctor"}
                      </button>
                    </div>
                  </div>
                </div>

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

                <DocApptTable
                  tab={tab}
                  activeData={activeRows}
                  historyData={historyRows}
                  onReviewClick={handleReviewClick}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {selectedReview && (
        <ReviewPopup
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          patient={selectedReview.patient}
          review={selectedReview.review}
        />
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <DeleteDoctor onCancel={handleCancelDelete} onConfirm={handleConfirmDelete} loading={deleting} />
        </div>
      )}
    </div>
  );
}
