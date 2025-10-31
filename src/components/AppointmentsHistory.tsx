import { useEffect, useMemo, useRef, useState } from "react";
import { BellIcon, SearchIcon, ArrowUpDownIcon } from "lucide-react";
import Sidebar from "./Sidebar";
import profile from "../assets/profile.svg";

type Row = {
  id: number;
  patientName: string;
  doctor: string;
  date: string;       // YYYY-MM-DD
  timeStart: string;  // HH:MM
  service: string;
  status: "COMPLETED" | "DECLINED";
};
type TabKey = "all" | "completed" | "declined";
type ApiResponse = { page: number; pageSize: number; total: number; items: any[] };

/* time helpers */
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
  const am = t.h < 12; const h = t.h % 12 || 12;
  return `${h}:${String(t.m).padStart(2,"0")} ${am ? "AM" : "PM"}`;
};
const addMinutesSafe = (hhmm: string | null | undefined, mins: number): string | null => {
  const t = parseHHMM(hhmm);
  if (!t) return null;
  const total = t.h * 60 + t.m + mins;
  const hh = Math.floor(((total % (24 * 60)) + (24 * 60)) % (24 * 60) / 60);
  const mm = ((total % (24 * 60)) + (24 * 60)) % (24 * 60) % 60;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
};
const prettyDate = (ymd?: string | null) => {
  if (!ymd) return "—";
  const [y,m,d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const dt = new Date(Date.UTC(y,m-1,d));
  return dt.toLocaleDateString(undefined, { year:"numeric", month:"long", day:"2-digit" });
};

const badgeClass = (s: Row["status"]) =>
  s === "DECLINED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-600";

/* robust normalizer */
const normalizeItem = (raw: any): Row => {
  const id = Number(raw.id ?? 0);
  const patientName = String(
    raw.patientName ?? raw.full_name ?? raw.name ?? ""
  ).trim();
  const doctor = String(
    raw.doctor ?? raw.doctorName ?? raw.dentist ?? ""
  ).trim();
  const date = String(raw.date ?? raw.preferredDate ?? "").slice(0, 10);
  const timeStart = String(raw.timeStart ?? raw.preferredTime ?? "").slice(0, 5);
  const service = String(
    raw.service ?? raw.serviceName ?? raw.procedureName ?? raw.procedure ?? ""
  ).trim();
  const s = String(raw.status ?? "").toUpperCase();
  const status: Row["status"] = s === "DECLINED" ? "DECLINED" : "COMPLETED";
  return { id, patientName, doctor, date, timeStart, service, status };
};

export default function AppointmentsHistory(): JSX.Element {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      const u = new URL("http://localhost:4002/api/admin/appointments");
      u.searchParams.set("page","1");
      u.searchParams.set("pageSize","500");
      if (query.trim()) u.searchParams.set("search", query.trim());

      const res = await fetch(u.toString(), { cache: "no-store", signal: ac.signal });
      const json: ApiResponse = await res.json();

      const all = (json.items || []).map(normalizeItem)
        .filter(x => x.status === "COMPLETED" || x.status === "DECLINED");

      const filtered =
        tab === "completed"
          ? all.filter(x => x.status === "COMPLETED")
          : tab === "declined"
            ? all.filter(x => x.status === "DECLINED")
            : all;

      setRows(filtered);
    } catch (e) {
      if ((e as any).name !== "AbortError") setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, query]);

  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [tab, query]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", load);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", load);
    };
  }, [tab, query]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("appointments-updated", handler);
    return () => window.removeEventListener("appointments-updated", handler);
  }, [tab, query]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aKey = `${a.date} ${a.timeStart}`;
      const bKey = `${b.date} ${b.timeStart}`;
      return sortAsc ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
    });
    return copy;
  }, [rows, sortAsc]);

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
                onChange={(e)=>setQuery(e.target.value)}
                placeholder="Search"
                className="border-0 outline-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 h-auto p-0 w-full"
              />
            </div>
            <BellIcon className="w-5 h-5 text-gray-600" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-4">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Appointments History</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : `You have ${rows.length} past appointments.`}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={() => setTab("all")}
                className={`pb-[2px] text-sm font-medium ${tab === "all" ? "text-[#2bacd0] border-b-2 border-[#2bacd0]" : "text-black"}`}
              >
                All
              </button>
              <button
                onClick={() => setTab("completed")}
                className={`pb-[2px] text-sm font-medium ${tab === "completed" ? "text-[#2bacd0] border-b-2 border-[#2bacd0]" : "text-black"}`}
              >
                Completed
              </button>
              <button
                onClick={() => setTab("declined")}
                className={`pb-[2px] text-sm font-medium ${tab === "declined" ? "text-[#2bacd0] border-b-2 border-[#2bacd0]" : "text-black"}`}
              >
                Declined
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#c4c4c4] bg-white shadow">
            <div className="p-0 overflow-x-hidden">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                </colgroup>

                <thead>
                  <tr className="border-b">
                    <th className="text-sm md:text-base font-bold text-gray-900 py-3 pl-8 text-left">
                      Patient Name
                    </th>
                    <th className="text-sm md:text-base font-bold text-gray-900 py-3 px-4 text-left">
                      Doctor
                    </th>
                    <th className="text-sm md:text-base font-bold text-gray-900 py-3 px-4 text-left">
                      <div className="flex items-center gap-2">
                        <span>Date</span>
                        <button
                          onClick={() => setSortAsc(s => !s)}
                          className="inline-flex items-center p-1.5 rounded-md border text-xs text-gray-700 hover:bg-gray-50"
                          title="Toggle date sort"
                          aria-label="Toggle date sort"
                        >
                          <ArrowUpDownIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </th>
                    <th className="text-sm md:text-base font-bold text-gray-900 py-3 px-4 text-left">
                      Time
                    </th>
                    <th className="text-sm md:text-base font-bold text-gray-900 py-3 px-4 text-left">
                      Service
                    </th>
                    <th className="text-sm md:text-base font-bold text-gray-900 py-3 px-4 text-left">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map(row => {
                    const start = to12hSafe(row.timeStart);
                    const endHM = addMinutesSafe(row.timeStart, 120);
                    const end = endHM ? to12hSafe(endHM) : "—";
                    const timeRange = start !== "—" && end !== "—" ? `${start} – ${end}` : "—";
                    return (
                      <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 pl-8 font-medium text-gray-900 text-sm truncate">
                          <div className="flex items-center gap-3">
                            <img src={profile} alt={`${row.patientName || "Patient"} profile`} className="w-9 h-9 rounded-full bg-white object-cover" />
                            <span className="truncate">{row.patientName || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{row.doctor || "—"}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{prettyDate(row.date)}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{timeRange}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{row.service || "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center rounded-full min-w-[70px] px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeClass(row.status)}`}>
                            {row.status === "DECLINED" ? "Declined" : "Completed"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-gray-500">No records.</td>
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
