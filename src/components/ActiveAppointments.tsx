import { useState } from "react";
import { BellIcon, SearchIcon, ChevronRight } from "lucide-react";
import Sidebar from "./Sidebar";
import profile from "../assets/profile.svg";

const appointmentData = [
  { patientName: "Juan Dela Cruz", doctor: "Dr. Krystal Cruz", date: "October 8, 2025", time: "1:00-2:00 PM", service: "Root Canal", status: "Approved" },
  { patientName: "Tripp Palma", doctor: "Dr. Miguel Suarez", date: "October 10, 2025", time: "9:00-10:00 AM", service: "Dental Braces", status: "Pending" },
  { patientName: "Drake Palma", doctor: "Dr. Brenda Estrada", date: "October 10, 2025", time: "9:00-10:00 AM", service: "Cleaning", status: "Pending" },
  { patientName: "Juan Pedro", doctor: "Dr. Ismael Junio", date: "October 01, 2025", time: "9:00-10:00AM", service: "Tooth Extraction", status: "Pending" },
  { patientName: "Alys Perez", doctor: "Dr. Krystal Cruz", date: "November 03, 2025", time: "4:00-5:00 PM", service: "Dental Consultation", status: "Approved" },
  { patientName: "Mark Keifer Watson", doctor: "Dr. Miguel Suarez", date: "October 14, 2025", time: "8:00-9:00 AM", service: "Tooth Filling", status: "Pending" },
  { patientName: "Jasper Jean Mariano", doctor: "Dr. Brenda Estrada", date: "November 14, 2025", time: "3:00-4:00 PM", service: "Dental Braces", status: "Pending" },
  { patientName: "Yuri Hanamitchi", doctor: "Dr. Ismael Junio", date: "October 20, 2025", time: "11:00-12:00 PM", service: "Root Canal", status: "Approved" },
  { patientName: "Rakki San Diego", doctor: "Dr. Krystal Cruz", date: "November 22, 2025", time: "9:00-10:00 AM", service: "Cleaning", status: "Approved" },
  { patientName: "Ella Dianne Hyun", doctor: "Dr. Miguel Suarez", date: "November 22, 2025", time: "4:00-5:00 PM", service: "Tooth Extraction", status: "Approved" },
];

type TabKey = "all" | "pending" | "approved";

const ActiveAppointments = (): JSX.Element => {
  const [tab, setTab] = useState<TabKey>("all");

  const filteredAppointments =
    tab === "all"
      ? appointmentData
      : appointmentData.filter((a) => a.status.toLowerCase() === tab);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">
                Active Appointments
              </h2>
              <p className="text-black/80 text-sm leading-tight">
                You have {filteredAppointments.length} total active appointments.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <button className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium">
                + Add Appointment
              </button>

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
                  onClick={() => setTab("pending")}
                  className={`pb-[2px] text-sm font-medium ${
                    tab === "pending"
                      ? "text-[#2bacd0] border-b-2 border-[#2bacd0]"
                      : "text-black"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setTab("approved")}
                  className={`pb-[2px] text-sm font-medium ${
                    tab === "approved"
                      ? "text-[#2bacd0] border-b-2 border-[#2bacd0]"
                      : "text-black"
                  }`}
                >
                  Approved
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
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
                    {[
                      "Patient Name",
                      "Doctor",
                      "Date",
                      "Time",
                      "Service",
                      "Status",
                      "",
                    ].map((head) => (
                      <th
                        key={head}
                        className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                          head === "Patient Name"
                            ? "pl-8 text-left"
                            : head === ""
                            ? "pr-8 text-right"
                            : "px-4 text-left"
                        }`}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredAppointments.map((appointment, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      {/* Profile */}
                      <td className="py-3 pl-8 font-medium text-gray-900 text-sm">
                        <div className="flex items-center gap-3">
                          <img
                            src={profile}
                            alt={`${appointment.patientName} profile`}
                            className="w-9 h-9 rounded-full bg-white object-cover"
                          />
                          <span className="truncate">{appointment.patientName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {appointment.doctor}
                      </td>

                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {appointment.date}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {appointment.time}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm truncate">
                        {appointment.service}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center rounded-full min-w-[70px] px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                            appointment.status === "Approved"
                              ? "bg-[#CFF7DA] text-[#2BAE66]"
                              : "bg-[#FFF2CC] text-[#F2B705]"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                      <td className="py-3 pr-8">
                        <div className="flex justify-end">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
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

export default ActiveAppointments;
