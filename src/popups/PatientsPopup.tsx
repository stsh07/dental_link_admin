import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PatientsPopup() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-8 sm:px-6 lg:py-12 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 shadow-lg">
          <div className="p-6 sm:p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-black hover:text-gray-700 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-base font-semibold">Back</span>
            </button>
          </div>

          <div className="px-6 sm:px-8 pb-8">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full bg-[#D9D9D9]" />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                <div>
                  <div className="text-xs font-semibold text-[#BDBDBD] mb-1">Full name</div>
                  <div className="text-sm sm:text-base text-black">Juan C. Dela Cruz</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#BDBDBD] mb-1">Age</div>
                  <div className="text-sm sm:text-base text-black">45</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#BDBDBD] mb-1">Gender</div>
                  <div className="text-sm sm:text-base text-black">Male</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#BDBDBD] mb-1">Email</div>
                  <div className="text-[11px] sm:text-xs text-black break-all">juandelacruz@gmail.com</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#BDBDBD] mb-1">Address</div>
                  <div className="text-[11px] sm:text-xs text-black">Arellano St., Dagupan City</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#BDBDBD] mb-1">Phone</div>
                  <div className="text-[11px] sm:text-xs text-black">09123456789</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center lg:justify-start lg:ml-0">
              <button className="px-6 py-2 bg-[#CF1D1D] hover:bg-[#B01818] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
                Delete patient
              </button>
            </div>
          </div>

          <div className="bg-white rounded-b-lg shadow-md">
            <div className="px-6 sm:px-8 pt-6 pb-4">
              <div className="inline-flex bg-[#EFEFEF] rounded-md p-1">
                <button
                  onClick={() => setActiveTab("active")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                    activeTab === "active" ? "bg-white text-[#30B8DE] shadow-sm" : "text-[#BDBDBD] hover:text-gray-600"
                  }`}
                >
                  Active Appointment
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                    activeTab === "history" ? "bg-white text-[#30B8DE] shadow-sm" : "text-[#BDBDBD] hover:text-gray-600"
                  }`}
                >
                  Appointment History
                </button>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-8">
              <div className="bg-[#EFEFEF] rounded-md p-4 sm:p-6">
                {activeTab === "active" ? (
                  <div className="bg-white rounded-lg p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0">
                      <div className="md:pr-8 md:border-r md:border-[#BDBDBD]">
                        <div className="text-xl sm:text-2xl font-bold text-black mb-1">October 30, 2025</div>
                        <div className="text-sm sm:text-base text-[#BDBDBD]">9AM</div>
                      </div>
                      <div className="md:px-8 md:border-r md:border-[#BDBDBD]">
                        <div className="text-xs sm:text-sm font-semibold text-[#BDBDBD] mb-1">Procedure</div>
                        <div className="text-lg sm:text-xl text-black">Cleaning</div>
                      </div>
                      <div className="md:pl-8">
                        <div className="text-xs sm:text-sm font-semibold text-[#BDBDBD] mb-1">Dentist</div>
                        <div className="text-lg sm:text-xl text-black">Dr. Ismael Junio</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <div className="text-[#BDBDBD]">No appointment history</div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-xs text-gray-400">Patient ID: {id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
