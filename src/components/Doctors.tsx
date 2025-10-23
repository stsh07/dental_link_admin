import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Plus, Bell as BellIcon, Search as SearchIcon, Calendar, Users } from "lucide-react";
import Modal from "./modal";
import AddDoctorPopup from "../popups/addDoctor";

type Doctor = {
  name: string;
  specialty: string;
  time: string;
  patientsToday: number;
  status: "At Work" | "Lunch" | "Off";
};

const doctors: Doctor[] = [
  { name: "Dr. Krystal", specialty: "Orthodontics", time: "08:00 – 17:00", patientsToday: 3, status: "At Work" },
  { name: "Dr. Miguel",  specialty: "Endodontics",  time: "08:00 – 17:00", patientsToday: 2, status: "Lunch" },
  { name: "Dr. Brenda",  specialty: "General",      time: "08:00 – 17:00", patientsToday: 4, status: "At Work" },
  { name: "Dr. Ismael",  specialty: "Surgery",      time: "08:00 – 17:00", patientsToday: 1, status: "At Work" },
];

function statusClass(status: Doctor["status"]) {
  if (status === "At Work") return "text-green-600";
  if (status === "Lunch") return "text-orange-500";
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
  const [showModal, setShowModal] = useState(false);

  const filtered = doctors.filter((d) =>
    !query.trim()
      ? true
      : d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.specialty.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header (same as Patients.tsx) */}
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
          {/* Info left + Add Doctor right (button on the RIGHT like before) */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Doctors List</h2>
              <p className="text-black/80 text-sm leading-tight">You have {doctors.length} doctors.</p>
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
            {filtered.map((doc) => (
              <div key={doc.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <Avatar name={doc.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{doc.name}</p>
                    <p className="text-sm text-gray-500 truncate">{doc.specialty}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{doc.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{doc.patientsToday} patients today</span>
                  </div>
                  <div className={`mt-1 font-medium ${statusClass(doc.status)}`}>{doc.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: BIG "New Doctor" aligned with ✕, no divider */}
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
    </div>
  );
};

export default Doctors;
