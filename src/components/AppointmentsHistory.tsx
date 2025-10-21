import { useEffect, useMemo, useState } from "react";
import { BellIcon, SearchIcon } from "lucide-react";
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

const badgeClass = (s: Row["status"]) =>
  s === "COMPLETED" ? "bg-blue-100 text-blue-600" : // blue
                      "bg-red-100 text-red-700";    // declined = red

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
};
const addMinutes = (hhmm: string, mins: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor((total / 60) % 24);
  const mm = total % 60;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
};
const prettyDate = (ymd: string) => {
  const [y,m,d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y,(m||1)-1,d||1));
  return dt.toLocaleDateString(undefined, { year:"numeric", month:"long", day:"2-digit" });
};

export default function AppointmentsHistory(): JSX.Element {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const u = new URL("http://localhost:4000/api/admin/appointments");
        // pull all then filter on client; you can call API 2x with status if you prefer
        u.searchParams.set("page","1");
        u.searchParams.set("pageSize","200");
        if (query.trim()) u.searchParams.set("search", query.trim());
        const res = await fetch(u.toString(), { cache: "no-store" });
        const json: ApiResponse = await res.json();
        const items = (json.items || []) as Array<{
          id:number, patientName:string, doctor:string, date:string, timeStart:string, service:string, status:string
        }>;
        const onlyHistory = items.filter(x => ["COMPLETED","DECLINED"].includes(x.status));
        setRows(onlyHistory as Row[]);
      } catch (e) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  const filtered = useMemo(() => {
    if (tab === "completed") return rows.filter(r => r.status === "COMPLETED");
    if (tab === "declined")  return rows.filter(r => r.status === "DECLINED");
    return rows;
  }, [rows, tab]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pt-4">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Appointments History</h2>
              <p className="text-black/80 text-sm leading-tight">
                {loading ? "Loading…" : `You have ${filtered.length} past appointments.`}
              </p>
            </div>

            {/* Tabs */}
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

          {/* Table */}
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
                    {["Patient Name","Doctor","Date","Time","Service","Status"].map(head => (
                      <th
                        key={head}
                        className={`text-sm md:text-base font-bold text-gray-900 py-3 ${head==="Patient Name" ? "pl-8 text-left" : "px-4 text-left"}`}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(row => {
                    const end = addMinutes(row.timeStart, 120);
                    const timeRange = `${to12h(row.timeStart)} – ${to12h(end)}`;
                    return (
                      <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 pl-8 font-medium text-gray-900 text-sm truncate">
                          <div className="flex items-center gap-3">
                            <img src={profile} alt={`${row.patientName} profile`} className="w-9 h-9 rounded-full bg-white object-cover" />
                            <span className="truncate">{row.patientName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{row.doctor}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{prettyDate(row.date)}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{timeRange}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{row.service}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center rounded-full min-w-[70px] px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeClass(row.status)}`}>
                            {row.status === "COMPLETED" ? "Completed" : "Declined"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && !loading && (
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
