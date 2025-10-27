import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { Plus, Bell as BellIcon, Search as SearchIcon, Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Modal from "./modal";
import AddDoctorPopup from "../popups/addDoctor";

type DoctorRow = {
  id: number;
  full_name: string;
  position?: string | null;
  work_time?: string | null;
  status?: "At Work" | "Lunch" | "Absent" | "Leave" | string | null;
  created_at?: string;
};

type ApiAppointment = {
  id: number;
  patientName: string;
  doctor: string;
  date: string;       // YYYY-MM-DD
  timeStart: string;  // HH:MM
  service: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED";
};

function statusClass(status?: string | null) {
  if (status === "At Work") return "text-green-600";
  if (status === "Lunch") return "text-orange-500";
  if (status === "Absent") return "text-gray-600";
  if (status === "Leave") return "text-gray-500";
  return "text-gray-500";
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
      {initials}
    </div>
  );
}

const Doctors: React.FC = () => {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // doctorName -> active appt count (PENDING + CONFIRMED)
  const [counts, setCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  async function loadDoctors(signal?: AbortSignal) {
    const res = await fetch("http://localhost:4000/api/doctors", { signal, cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Load doctors failed");
    return json.doctors as DoctorRow[];
  }

  async function loadActiveAppointments(signal?: AbortSignal) {
    // We fetch admin appointments and group them by doctor for counts
    const u = new URL("http://localhost:4000/api/admin/appointments");
    u.searchParams.set("page", "1");
    u.searchParams.set("pageSize", "500");
    const res = await fetch(u.toString(), { signal, cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Load appointments failed");
    const items: ApiAppointment[] = json.items || [];

    // Only count active ones (PENDING + CONFIRMED)
    const active = items.filter(a => a.status === "PENDING" || a.status === "CONFIRMED");
    const map: Record<string, number> = {};
    for (const a of active) {
      const key = (a.doctor || "").trim();
      if (!key) continue;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }

  async function loadAll() {
    try {
      setLoading(true);
      setErr(null);
      const ctrl = new AbortController();
      const [d, c] = await Promise.all([
        loadDoctors(ctrl.signal),
        loadActiveAppointments(ctrl.signal),
      ]);
      setRows(d);
      setCounts(c);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
      setRows([]);
      setCounts({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Refresh when appointments or doctors change elsewhere
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

  const filtered = rows.filter((d) => {
    const n = (d.full_name || "").toLowerCase();
    const p = (d.position || "").toLowerCase();
    const q = query.trim().toLowerCase();
    return !q || n.includes(q) || p.includes(q);
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
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
            <BellIcon className="w-5 h-5 text-gray-600" />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Doctors List</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : `You have ${rows.length} doctors.`}
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

          {/* Grid */}
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
                    <Avatar name={doc.full_name} />
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

      {/* Add Doctor POPUP */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        showDivider={false}
        headerSlot={
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-black leading-tight truncate">
            New Doctor
          </h1>
        }
      >
        <AddDoctorPopup />
      </Modal>
    </div>
  );
};

export default Doctors;
