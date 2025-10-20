import Sidebar from "./Sidebar";
import { BellIcon, SearchIcon, ChevronRight } from "lucide-react"; // 🧩 replaced Trash2 with ChevronRight
import profile from "../assets/profile.svg";

type Patient = {
  name: string;
  age: number;
  gender: "Male" | "Female";
  email: string;
  contact: string;
  lastVisit: string;
};

const patientsData: Patient[] = [
  { name: "Ted Bundy", age: 35, gender: "Male", email: "ted.bundy@example.com", contact: "0917 111 1111", lastVisit: "October 1, 2025" },
  { name: "Walther Funk", age: 40, gender: "Male", email: "walther.funk@example.com", contact: "0917 222 2222", lastVisit: "October 2, 2025" },
  { name: "Joseph Stalin", age: 60, gender: "Male", email: "joseph.stalin@example.com", contact: "0917 333 3333", lastVisit: "October 3, 2025" },
  { name: "Heinrich Himmler", age: 50, gender: "Male", email: "heinrich.himmler@example.com", contact: "0917 444 4444", lastVisit: "October 4, 2025" },
  { name: "George Floyd", age: 46, gender: "Male", email: "george.floyd@example.com", contact: "0917 555 5555", lastVisit: "October 5, 2025" },
  { name: "Charlie Kirk", age: 30, gender: "Male", email: "charlie.kirk@example.com", contact: "0917 666 6666", lastVisit: "October 6, 2025" },
  { name: "El Chapo", age: 65, gender: "Male", email: "el.chapo@example.com", contact: "0917 777 7777", lastVisit: "October 7, 2025" },
  { name: "Adolf Hitler", age: 56, gender: "Male", email: "adolf.hitler@example.com", contact: "0917 888 8888", lastVisit: "October 8, 2025" },
  { name: "Arthur Morgan", age: 38, gender: "Male", email: "arthur.morgan@example.com", contact: "0917 999 9999", lastVisit: "October 9, 2025" },
  { name: "Osama Bin Laden", age: 54, gender: "Male", email: "osama.binladen@example.com", contact: "0917 000 0000", lastVisit: "October 10, 2025" },
];

const Patients = (): JSX.Element => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Patients</h1>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-[320px] h-10 bg-white rounded-full border border-[#d9d9d9] shadow-inner flex items-center px-4">
              <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
              <input
                placeholder="Search"
                className="border-0 outline-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 h-auto p-0 w-full"
              />
            </div>
            <BellIcon className="w-5 h-5 text-gray-600" />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
          {/* Section Header */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-black text-xl font-semibold leading-tight">Patients List</h2>
              <p className="text-black/80 text-sm leading-tight">
                You have {patientsData.length} patients in total.
              </p>
            </div>

            <button className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium">
              + Add Patient
            </button>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[#c4c4c4] bg-white shadow">
            <div className="p-0 overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[15%]" /> {/* Name + Profile */}
                  <col className="w-[5%]" />  {/* Age */}
                  <col className="w-[6%]" />  {/* Gender */}
                  <col className="w-[15%]" /> {/* Email */}
                  <col className="w-[8%]" /> {/* Contact */}
                  <col className="w-[10%]" /> {/* Last Visit */}
                  <col className="w-[6%]" />  {/* Actions */}
                </colgroup>

                <thead>
                  <tr className="border-b">
                    {["Patient", "Age", "Gender", "Email", "Contact", "Last Visit", ""].map(
                      (head) => (
                        <th
                          key={head}
                          className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                            head === "Patient" ? "pl-8 text-left" : "px-4 text-left"
                          }`}
                        >
                          {head}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {patientsData.map((p, i) => (
                    <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 pl-8 text-sm font-medium text-gray-900 flex items-center gap-3">
                        <img
                          src={profile}
                          alt={`${p.name} profile`}
                          className="w-9 h-9 rounded-full bg-white object-cover"
                        />
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.age}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.gender}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.email}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.contact}</td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{p.lastVisit}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition"
                          aria-label={`View ${p.name} details`}
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" /> {/* ⮞ Chevron icon instead of Trash */}
                        </button>
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

export default Patients;
