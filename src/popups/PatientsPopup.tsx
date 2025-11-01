// src/popups/PatientsPopup.tsx
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type PatientsPopupProps = {
  patientId?: number;
};

type Patient = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  age: number | null;
  address: string | null;
  lastVisit: string | null;
};

type PatientAppointment = {
  id: number;
  procedure: string;
  date: string;
  time: string;
  dentist: string;
  status: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

export default function PatientsPopup({ patientId }: PatientsPopupProps) {
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appts, setAppts] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 🔁 fetch real data
  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!patientId) {
        setErr("Missing patient id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr(null);
      try {
        // 1) get the patient itself
        const pRes = await fetch(`${API_BASE}/api/admin/patients/${patientId}`, {
          cache: "no-store",
        });
        const pJson = await pRes.json();
        if (!pRes.ok || !pJson.ok) {
          throw new Error(pJson.error || "Failed to load patient");
        }

        // 2) get appointment history for that patient
        const aRes = await fetch(
          `${API_BASE}/api/admin/patients/${patientId}/appointments`,
          { cache: "no-store" }
        );
        const aJson = await aRes.json();

        if (!ignore) {
          setPatient(pJson.patient);
          setAppts(aJson.ok ? aJson.items || [] : []);
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.message || "Failed to load patient");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [patientId]);

  const handleBack = () => {
    navigate("/patients");
  };

  const handleDeletePatient = () => {
    if (!patientId) return;
    if (confirm("Are you sure you want to delete this patient?")) {
      console.log("Delete patient", patientId);
      // TODO: call DELETE /api/admin/patients/:id if you add it
    }
  };

  return (
    <div className="w-full bg-white rounded-[14px] shadow-[0_4px_15px_1px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* ─────────── TOP ─────────── */}
      <div className="px-6 md:px-10 pt-6 md:pt-8 pb-4 md:pb-6 bg-[#F9FAFB]">
        {/* back */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-black hover:opacity-70 transition mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-semibold text-base">Back</span>
        </button>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : err ? (
          <p className="text-sm text-red-500">Error: {err}</p>
        ) : patient ? (
          <div className="flex flex-col md:flex-row gap-8">
            {/* circle avatar */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="w-[135px] h-[135px] rounded-full bg-[#DDDEE2]" />
            </div>

            {/* info grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-5">
              <div>
                <p className="text-[11px] font-semibold text-[#4B4B4B] mb-1">Full name</p>
                <p className="text-[15px] font-semibold text-[#151515] leading-tight">
                  {patient.name}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#4B4B4B] mb-1">Age</p>
                <p className="text-[15px] font-semibold text-[#151515]">
                  {patient.age ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#4B4B4B] mb-1">Gender</p>
                <p className="text-[15px] font-semibold text-[#151515]">
                  {patient.gender ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#4B4B4B] mb-1">Email</p>
                <p className="text-[11px] font-semibold text-[#151515] break-all">
                  {patient.email ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#4B4B4B] mb-1">Address</p>
                <p className="text-[11px] font-semibold text-[#151515]">
                  {patient.address ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#4B4B4B] mb-1">Phone</p>
                <p className="text-[11px] font-semibold text-[#151515]">
                  {patient.phone ?? "—"}
                </p>
              </div>

              {/* delete button full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  onClick={handleDeletePatient}
                  className="mt-1 inline-flex items-center justify-center px-6 py-2 bg-[#DC3E3E] text-white text-[11px] font-semibold rounded-lg hover:bg-red-600 transition"
                >
                  Delete patient
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ─────────── DIVIDER (keep) ─────────── */}
      <div className="h-[1px] bg-[#E7E7E7]" />

      {/* ─────────── BOTTOM ─────────── */}
      <div className="bg-[#F7F7F7] pt-8 pb-10 px-6 md:px-10">
        {/* little pill */}
        <div className="inline-flex bg-[#ECEFF1] rounded-[11px] px-5 py-2 mb-5">
          <span className="text-[13px] font-semibold text-[#1DB5DB]">
            Appointment History
          </span>
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_4px_8px_rgba(0,0,0,0.02)] overflow-hidden border border-[#E5E5E5]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#23BDE1] text-white">
                  <th className="text-left px-6 py-3 text-sm font-semibold">Procedure</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold">Dentist</th>
                </tr>
              </thead>
              <tbody>
                {appts.length > 0 ? (
                  appts.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-[#E5E5E5] hover:bg-[#F9FAFB] transition"
                    >
                      <td className="px-6 py-4 text-sm text-[#151515]">
                        {item.procedure || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#151515]">
                        {item.date || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#151515]">
                        {item.dentist || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-sm text-gray-500">
                      No appointment history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hidden md:block h-4 bg-transparent" />
        </div>
      </div>
    </div>
  );
}
