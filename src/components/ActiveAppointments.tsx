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

type ApiResponse = { page: number; pageSize: number; total: number; items: ApiAppointment[] };

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
const fmtDatePretty = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
};

const uiStatus = (s: ApiAppointment["status"]) =>
  s === "CONFIRMED" ? "Approved" :
  s === "PENDING"  ? "Pending"  :
  s === "COMPLETED"? "Completed":
                     "Declined";

const badgeClasses = (s: ApiAppointment["status"]) =>
  s === "CONFIRMED" ? "bg-[#CFF7DA] text-[#2BAE66]" : // green
  s === "PENDING"  ? "bg-[#FFF2CC] text-[#F2B705]" :  // yellow
  s === "COMPLETED"? "bg-blue-100 text-blue-600" :    // blue
                     "bg-red-100 text-red-700";       // declined = red

const isActive = (s: ApiAppointment["status"]) => s === "PENDING" || s === "CONFIRMED";

/* ===================== DETAIL EXTRACTOR HELPERS ===================== */
const isBlank = (v: any) => v == null || (typeof v === "string" && v.trim() === "");

const scan = (
  obj: any,
  pred: (key: string, val: any, path: string[]) => boolean,
  path: string[] = []
): { path: string[]; value: any } | null => {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const child = obj[i];
      const got = scan(child, pred, [...path, String(i)]);
      if (got) return got;
    }
    return null;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (pred(k, v, path)) return { path: [...path, k], value: v };
    const got = scan(v, pred, [...path, k]);
    if (got) return got;
  }
  return null;
};

const findTextByKeys = (obj: any, keys: string[]): string | null => {
  const keySet = new Set(keys.map(k => k.toLowerCase()));
  const res = scan(obj, (k, v) => keySet.has(k.toLowerCase()) && !isBlank(v));
  return res ? String(res.value).trim() : null;
};
const findNumberByKeys = (obj: any, keys: string[]): number | null => {
  const keySet = new Set(keys.map(k => k.toLowerCase()));
  const res = scan(obj, (k, v) => keySet.has(k.toLowerCase()) && Number.isFinite(Number(v)));
  if (!res) return null;
  const n = Number(res.value);
  return Number.isFinite(n) ? n : null;
};
const ageFromDob = (dobStr: string | null): number | null => {
  if (!dobStr) return null;
  const d = new Date(dobStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age > 0 ? age : null;
};
const findEmailByPattern = (obj: any): string | null => {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const res = scan(obj, (_k, v) => typeof v === "string" && emailRe.test(v.trim()));
  return res ? res.value.trim() : null;
};
const findPhoneByPattern = (obj: any): string | null => {
  const res = scan(obj, (_k, v) => {
    if (typeof v !== "string" && typeof v !== "number") return false;
    const s = String(v);
    const digits = s.replace(/\D/g, "");
    return digits.length >= 7;
  });
  return res ? String(res.value).trim() : null;
};
const findGenderByPattern = (obj: any): string | null => {
  const res = scan(obj, (_k, v) => {
    if (isBlank(v)) return false;
    const s = String(v).trim().toLowerCase();
    return ["male", "female", "m", "f", "other", "non-binary"].includes(s);
  });
  return res ? String(res.value).trim() : null;
};

const toAddressString = (val: any): string | null => {
  if (typeof val === "string" && !isBlank(val)) return val.trim();
  if (val && typeof val === "object") {
    const parts = [
      val.line1 ?? val.street ?? val.street1 ?? val.addressLine1,
      val.line2 ?? val.barangay ?? val.addressLine2,
      val.city ?? val.municipality,
      val.province ?? val.state,
      val.zip ?? val.postalCode,
    ];
    const s = parts.filter(p => !isBlank(p)).map(String).join(", ");
    return s || null;
  }
  return null;
};
const findAddress = (obj: any): string | null => {
  const k = scan(obj, (key, v) => /address/i.test(key) && !isBlank(v));
  const chosen = k ? toAddressString(k.value) : null;
  if (chosen) return chosen;
  const line1 = findTextByKeys(obj, ["line1", "street", "addressLine1"]);
  const line2 = findTextByKeys(obj, ["line2", "barangay", "addressLine2"]);
  const city  = findTextByKeys(obj, ["city", "municipality"]);
  const prov  = findTextByKeys(obj, ["province", "state"]);
  const zip   = findTextByKeys(obj, ["zip", "postalCode"]);
  const s = [line1, line2, city, prov, zip].filter(x => !isBlank(x)).join(", ");
  return s || null;
};

const extractDetail = (raw: any): Partial<AppointmentDetail> => {
  const roots = [raw, raw?.data, raw?.appointment, raw?.result, raw?.payload].filter(Boolean);
  let email  = null as string | null;
  let phone  = null as string | null;
  let gender = null as string | null;
  let age    = null as number | null;
  let address= null as string | null;
  let notes  = null as string | null;

  for (const r of roots) {
    email  ||= findTextByKeys(r, ["email", "patientEmail", "userEmail", "contactEmail"]) || findEmailByPattern(r);
    phone  ||= findTextByKeys(r, ["phone", "phoneNumber", "contactNumber", "mobile", "contactNo", "tel", "telephone"]) || findPhoneByPattern(r);
    gender ||= findTextByKeys(r, ["gender", "sex"]) || findGenderByPattern(r);
    notes  ||= findTextByKeys(r, ["notes", "note", "remarks"]);
    age    ||= findNumberByKeys(r, ["age", "patientAge"]);
    if (!age) {
      const dob = findTextByKeys(r, ["dob", "dateOfBirth", "birthDate", "birthday"]);
      age = ageFromDob(dob || null);
    }
    address ||= findAddress(r);
  }

  return { email, phone, gender, notes, age, address };
};
/* =================================================================== */

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

  // Load active appointments (server returns all; we filter by tab)
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const u = new URL("http://localhost:4000/api/admin/appointments");
        if (query.trim()) u.searchParams.set("search", query.trim());
        u.searchParams.set("page", "1");
        u.searchParams.set("pageSize", "100");
        const res = await fetch(u.toString(), { cache: "no-store" });
        const json: ApiResponse = await res.json();
        if (!res.ok) throw new Error((json as any).error || "load failed");
        setItems(json.items || []);
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
    if (tab === "pending")  return items.filter(a => a.status === "PENDING");
    if (tab === "approved") return items.filter(a => a.status === "CONFIRMED");
    return items.filter(a => isActive(a.status)); // All = Pending + Approved
  }, [items, tab]);

  // fetch details for popup
  const fetchDetails = async (id: number) => {
    const res = await fetch(`http://localhost:4000/api/admin/appointments/${id}`, { cache: "no-store" });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error || "load details failed");
    return extractDetail(raw) as Partial<AppointmentDetail>;
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
    } catch (e) {
      console.error(e);
    }
  };

  // local + popup status update
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

  // Pending -> Approve
  const handleApprove = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await patchStatus(selected.id, "CONFIRMED");
      updateStatusLocal(selected.id, "CONFIRMED");
      setOpen(false);
      setSelected(null);
    } catch (e) {
      alert((e as any).message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  // Pending -> Decline (goes to History)
  const handleDecline = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await patchStatus(selected.id, "DECLINED");
      updateStatusLocal(selected.id, "DECLINED"); // disappears from Active views
      setOpen(false);
      setSelected(null);
      // notify history + navigate
      window.dispatchEvent(new Event("appointments-updated"));
      navigate("/appointment-history");
    } catch (e) {
      alert((e as any).message || "Failed to decline");
    } finally {
      setActionLoading(false);
    }
  };

  // Approved -> Completed (goes to History)
  const handleComplete = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await patchStatus(selected.id, "COMPLETED");
      updateStatusLocal(selected.id, "COMPLETED"); // disappears from Active views
      setOpen(false);
      setSelected(null);
      // notify history + navigate
      window.dispatchEvent(new Event("appointments-updated"));
      navigate("/appointment-history");
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

        {/* content wrapper is relative so popup stays inside */}
        <div className="relative flex-1 overflow-y-auto px-8 pt-4 pb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Active Appointments</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : error ? `Error: ${error}` : `You have ${filtered.length} total active appointments.`}
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

          {/* table */}
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
                    const [sh, sm] = a.timeStart.split(":").map(Number);
                    const start12 = to12h(sh, sm);
                    const endHM = addMinutes(a.timeStart, 120);
                    const [eh, em] = endHM.split(":").map(Number);
                    const end12 = to12h(eh, em);
                    const timeRange = `${start12} – ${end12}`;
                    const datePretty = fmtDatePretty(a.date);

                    return (
                      <tr key={a.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 pl-8 font-medium text-gray-900 text-sm">
                          <div className="flex items-center gap-3">
                            <img src={profile} alt={`${a.patientName} profile`} className="w-9 h-9 rounded-full bg-white object-cover" />
                            <span className="truncate">{a.patientName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{a.doctor}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{datePretty}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{timeRange}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{a.service}</td>
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

          {/* Popup */}
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
