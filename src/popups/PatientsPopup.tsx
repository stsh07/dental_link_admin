import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DeletePatient from "./deletePatient";

type PatientsPopupProps = { patientId?: number };

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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

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
        const pRes = await fetch(`${API_BASE}/api/admin/patients/${patientId}`, { cache: "no-store" });
        const pJson = await pRes.json();
        if (!pRes.ok || !pJson.ok) throw new Error(pJson.error || "Failed to load patient");

        const aRes = await fetch(`${API_BASE}/api/admin/patients/${patientId}/appointments`, { cache: "no-store" });
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
    return () => { ignore = true; };
  }, [patientId]);

  const handleBack = () => navigate("/patients");

  const handleDeleteClick = () => {
    setDeleteErr(null);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientId) return;
    try {
      setDeleting(true);
      setDeleteErr(null);
      const res = await fetch(`${API_BASE}/api/admin/patients/${patientId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Delete failed (HTTP ${res.status})`);
      }
      window.dispatchEvent(new Event("patients-updated"));
      setConfirmOpen(false);
      navigate("/patients");
    } catch (e: any) {
      setDeleteErr(e?.message || "Failed to delete patient");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setConfirmOpen(false);
  };

  return (
    <div className="w-full bg-white rounded-[14px] shadow-[0_4px_15px_1px_rgba(0,0,0,0.08)] overflow-hidden relative">
      {/* top */}
      <div className="px-6 md:px-10 pt-6 md:pt-8 pb-4 md:pb-6 bg-white">
        <button onClick={handleBack} className="flex items-center gap-2 text-black hover:opacity-70 transition mb-8">
          <ChevronLeft className="w-4 h-4" />
          <span className="font-semibold text-base">Back</span>
        </button>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : err ? (
          <p className="text-sm text-red-500">Error: {err}</p>
        ) : patient ? (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="w-[135px] h-[135px] rounded-full bg-white border border-[#DDDEE2]" />
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-5">
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] mb-1">Full name</p>
                <p className="text-[15px] font-semibold text-[#151515] leading-tight">{patient.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] mb-1">Age</p>
                <p className="text-[15px] font-semibold text-[#151515]">{patient.age ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] mb-1">Gender</p>
                <p className="text-[15px] font-semibold text-[#151515]">{patient.gender ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] mb-1">Email</p>
                <p className="text-[11px] font-semibold text-[#151515] break-all">{patient.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] mb-1">Address</p>
                <p className="text-[11px] font-semibold text-[#151515]">{patient.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] mb-1">Phone</p>
                <p className="text-[11px] font-semibold text-[#151515]">{patient.phone ?? "—"}</p>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                {deleteErr && (
                  <div className="mb-2 text-[12px] text-red-600 font-medium">Delete error: {deleteErr}</div>
                )}
                <button
                  onClick={handleDeleteClick}
                  className="mt-1 inline-flex items-center justify-center px-6 py-2 bg-[#DC3E3E] text-white text-[11px] font-semibold rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete patient"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-[1px] bg-[#E7E7E7]" />

      {/* bottom */}
      <div className="bg-white pt-8 pb-10 px-6 md:px-10">
        <div className="inline-flex rounded-[11px] px-0 py-0 mb-5">
          <span className="text-[13px] font-semibold text-[#111827]">Appointment History</span>
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_4px_8px_rgba(0,0,0,0.02)] overflow-hidden border border-[#E5E5E5]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#30B8DE]">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white border-b border-[#E5E5E5]">Procedure</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white border-b border-[#E5E5E5]">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white border-b border-[#E5E5E5]">Dentist</th>
                </tr>
              </thead>
              <tbody>
                {appts.length > 0 ? (
                  appts.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F9FAFB] transition">
                      <td className="px-6 py-4 text-sm text-[#151515] border-b border-[#E5E5E5]">{item.procedure || "—"}</td>
                      <td className="px-6 py-4 text-sm text-[#151515] border-b border-[#E5E5E5]">{item.date || "—"}</td>
                      <td className="px-6 py-4 text-sm text-[#151515] border-b border-[#E5E5E5]">{item.dentist || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-sm text-gray-500">No appointment history.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hidden md:block h-4 bg-transparent" />
        </div>
      </div>

      {/* modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <DeletePatient
            onCancel={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            loading={deleting}
          />
        </div>
      )}
    </div>
  );
}
