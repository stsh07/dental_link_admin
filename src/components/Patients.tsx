import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { BellIcon, SearchIcon, ChevronRight } from "lucide-react";
import profile from "../assets/profile.svg";
import PatientsPopup from "../popups/PatientsPopup";

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

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const prettyDate = (ymd?: string | null) => {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
};

export default function Patients(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  // If URL is /patients/:id -> render the detail page content-only (keeps sidebar/header)
  if (id) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
            <h1 className="text-black text-[28px] font-semibold">Patients</h1>
            <div />
          </header>
          <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
            <PatientsPopup />
          </div>
        </main>
      </div>
    );
  }

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
      u.searchParams.set("pageSize", "100");
      if (query.trim()) u.searchParams.set("search", query.trim());

      const res = await fetch(u.toString(), { cache: "no-store", signal: ac.signal });
      const json: ApiResponse = await res.json();
      if (!res.ok) throw new Error((json as any).error || "Failed to load patients");
      setRows(json.items || []);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr(e?.message || "Failed to load patients");
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query]);

  useEffect(() => {
    const onUpdate = () => load();
    window.addEventListener("patients-updated", onUpdate);
    window.addEventListener("appointments-updated", onUpdate);
    return () => {
      window.removeEventListener("patients-updated", onUpdate);
      window.removeEventListener("appointments-updated", onUpdate);
    };
  }, []);

  const totalPatients = rows.length;
  const displayRows = useMemo(() => rows, [rows]);

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
            <BellIcon className="w-5 h-5 text-gray-600" />
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
            <button className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium">
              + Add Patient
            </button>
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
                  {displayRows.map((p) => (
                    <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 pl-8 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <img
                            src={profile}
                            alt={`${p.name} profile`}
                            className="w-9 h-9 rounded-full bg-white object-cover"
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.age ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.gender ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.email ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.phone ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">
                        {prettyDate(p.lastVisit)}
                      </td>
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

                  {!loading && !err && displayRows.length === 0 && (
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
    </div>
  );
}
