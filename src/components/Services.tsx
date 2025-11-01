// src/components/Services.tsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import {
  BellIcon,
  SearchIcon,
  Plus,
  Trash2,
  Calendar,
  Stethoscope,
} from "lucide-react";
import dentalBraces from "../assets/dentalBraces.svg";
import cleaning from "../assets/cleaning.svg";
import rootCCanal from "../assets/rootCCanal.svg";
import toothExtraction from "../assets/toothExtraction.svg";
import dentalConsultation from "../assets/dentalConsultation.svg";
import toothFilling from "../assets/toothFilling.svg";
import DeleteService from "../popups/deleteService";
import AddService from "../popups/addService";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

type Service = {
  id: number;
  name: string;
  description: string;
  appointments: number;
  image: string;
};

const IMAGE_MAP: Record<string, string> = {
  "dentalBraces.svg": dentalBraces,
  dentalBraces: dentalBraces,
  "cleaning.svg": cleaning,
  cleaning: cleaning,
  "rootCCanal.svg": rootCCanal,
  rootCCanal: rootCCanal,
  "toothExtraction.svg": toothExtraction,
  toothExtraction: toothExtraction,
  "dentalConsultation.svg": dentalConsultation,
  dentalConsultation: dentalConsultation,
  "toothFilling.svg": toothFilling,
  toothFilling: toothFilling,
};

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);

  const toService = (svc: any): Service => {
    const img = svc.image_url?.toString()?.trim() || "";
    let imgSrc = dentalConsultation;
    if (img.includes("/")) {
      imgSrc = `${API_BASE}/uploads/${img}`;
    } else if (img) {
      imgSrc = IMAGE_MAP[img] || dentalConsultation;
    }
    return {
      id: svc.id,
      name: svc.name,
      description: svc.description || "",
      appointments: 0,
      image: imgSrc,
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/services`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to fetch");
        const items: Service[] = (json.data || []).map(toService);
        setServices(items);
        setError("");
      } catch (e: any) {
        setError(e.message || "Failed to load services");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalServices = services.length;
    const totalAppointments = services.reduce(
      (acc, s) => acc + (s.appointments || 0),
      0
    );
    return [
      {
        label: "Total Services",
        value: totalServices.toString(),
        icon: Stethoscope,
      },
      {
        label: "Active Appointments",
        value: totalAppointments.toString(),
        icon: Calendar,
      },
    ];
  }, [services]);

  const handleDeleteClick = (service: Service) => {
    setDeleteTargetId(service.id);
    setDeleteTargetName(service.name);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId == null) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/services/${deleteTargetId.toString()}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to delete service");
      setServices((prev) => prev.filter((s) => s.id !== deleteTargetId));
      setDeleteOpen(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
    } catch (e: any) {
      alert(e.message || "Failed to delete service");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetName("");
  };

  const handleAddCreated = (svc: any) => {
    const newSvc = toService(svc);
    setServices((prev) => [...prev, newSvc]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Services</h1>
          <div className="flex items-center gap-4">
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

        <div className="flex-1 overflow-y-auto px-8 pt-5 pb-8">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Services Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your dental services and appointments
              </p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-cyan-400"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "rgba(48, 184, 222, 0.3)" }}
                  >
                    <stat.icon
                      className="w-6 h-6"
                      style={{ color: "#3165DC" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading services…</p>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="relative h-64 overflow-hidden bg-gray-100">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {service.appointments} appointments
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteClick(service)}
                        className="p-2 text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!loading && services.length === 0 ? (
              <p className="text-gray-500 text-sm">No services found.</p>
            ) : null}
          </div>
        </div>
      </main>

      <DeleteService
        open={deleteOpen}
        serviceName={deleteTargetName}
        loading={deleteLoading}
        onYes={handleConfirmDelete}
        onNo={handleCancelDelete}
      />

      <AddService
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleAddCreated}
      />
    </div>
  );
};

export default Services;
