import { useState } from "react";
import { BellIcon, SearchIcon } from "lucide-react";
import Sidebar from "./Sidebar";
import profile from "../assets/profile.svg";

type HistoryStatus = "Completed" | "Declined";
type TabKey = "all" | "completed" | "declined";

const historyData: Array<{
  patientName: string;
  doctor: string;
  date: string;
  time: string;
  service: string;
  status: HistoryStatus;
}> = [
  { patientName: "Juan Dela Cruz", doctor: "Dr. Krystal Cruz", date: "October 1, 2025", time: "1:00-2:00 PM", service: "Root Canal", status: "Completed" },
  { patientName: "Tripp Palma", doctor: "Dr. Miguel Suarez", date: "October 2, 2025", time: "9:00-10:00 AM", service: "Dental Braces", status: "Declined" },
  { patientName: "Drake Palma", doctor: "Dr. Brenda Estrada", date: "October 3, 2025", time: "9:00-10:00 AM", service: "Cleaning", status: "Completed" },
  { patientName: "Juan Pedro", doctor: "Dr. Ismael Junio", date: "October 4, 2025", time: "9:00-10:00 AM", service: "Tooth Extraction", status: "Declined" },
  { patientName: "Alys Perez", doctor: "Dr. Krystal Cruz", date: "October 5, 2025", time: "4:00-5:00 PM", service: "Dental Consultation", status: "Completed" },
];

const badgeClass = (status: HistoryStatus) =>
  status === "Completed"
    ? "bg-blue-100 text-blue-600"
    : "bg-red-100 text-red-700";

const AppointmentsHistory = (): JSX.Element => {
  const [tab, setTab] = useState<TabKey>("all");

  const filteredData =
    tab === "all"
      ? historyData
      : historyData.filter((row) => row.status.toLowerCase() === tab);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top App Header */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Appointments</h1>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-[320px] h-10 bg-white rounded-full border border-[#d9d9d9] shadow-inner flex items-center px-4">
              <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
              <input
                placeholder="Search"
                className="border-0 outline-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 h-auto p-0 w-full"
              />
            </div>

            {/* Notification Icon */}
            <BellIcon className="w-5 h-5 text-gray-600" />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pt-4">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">
                Appointments History
              </h2>
              <p className="text-black/80 text-sm leading-tight">
                You have {filteredData.length} past appointments.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => setTab("all")}
                className={`pb-[2px] text-sm font-medium ${
                  tab === "all"
                    ? "text-[#2bacd0] border-b-2 border-[#2bacd0]"
                    : "text-black"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTab("completed")}
                className={`pb-[2px] text-sm font-medium ${
                  tab === "completed"
                    ? "text-[#2bacd0] border-b-2 border-[#2bacd0]"
                    : "text-black"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setTab("declined")}
                className={`pb-[2px] text-sm font-medium ${
                  tab === "declined"
                    ? "text-[#2bacd0] border-b-2 border-[#2bacd0]"
                    : "text-black"
                }`}
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
                    {["Patient Name", "Doctor", "Date", "Time", "Service", "Status"].map(
                      (head) => (
                        <th
                          key={head}
                          className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                            head === "Patient Name"
                              ? "pl-8 text-left"
                              : "px-4 text-left"
                          }`}
                        >
                          {head}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      {/* profile */}
                      <td className="py-3 pl-8 font-medium text-gray-900 text-sm truncate">
                        <div className="flex items-center gap-3">
                          <img
                            src={profile}
                            alt={`${row.patientName} profile`}
                            className="w-9 h-9 rounded-full bg-white object-cover"
                          />
                          <span className="truncate">{row.patientName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {row.doctor}
                      </td>

                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {row.date}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {row.time}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {row.service}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center rounded-full min-w-[70px] px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* End Table */}
        </div>
      </main>
    </div>
  );
};

export default AppointmentsHistory;
