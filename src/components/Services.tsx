import Sidebar from "./Sidebar";
import {
  BellIcon,
  SearchIcon,
  Plus,
  Trash2,
  Calendar,
  Stethoscope,
} from "lucide-react";

// SVG assets
import dentalBraces from "../assets/dentalBraces.svg";
import cleaning from "../assets/cleaning.svg";
import rootCCanal from "../assets/rootCCanal.svg";
import toothExtraction from "../assets/toothExtraction.svg";
import dentalConsultation from "../assets/dentalConsultation.svg";
import toothFilling from "../assets/toothFilling.svg";

interface Service {
  id: number;
  name: string;
  description: string;
  appointments: number;
  image: string;
}

const Services = (): JSX.Element => {
  const services: Service[] = [
    {
      id: 1,
      name: "Dental Braces",
      description:
        "Orthodontic treatment using brackets and wires (or aligners) to straighten teeth and correct bite issues.",
      appointments: 48,
      image: dentalBraces,
    },
    {
      id: 2,
      name: "Cleaning",
      description:
        "Professional removal of plaque, tartar, and stains to prevent cavities and gum disease.",
      appointments: 156,
      image: cleaning,
    },
    {
      id: 3,
      name: "Root Canal",
      description:
        "Removes infected or inflamed pulp from inside the tooth, cleans it, and seals it to save the tooth.",
      appointments: 42,
      image: rootCCanal,
    },
    {
      id: 4,
      name: "Tooth Extraction",
      description:
        "Removal of a tooth that is decayed, damaged, or impacted (like wisdom teeth).",
      appointments: 73,
      image: toothExtraction,
    },
    {
      id: 5,
      name: "Dental Consultation",
      description:
        "Initial check-up where the dentist examines your teeth, gums, and mouth, often with x-rays if needed.",
      appointments: 124,
      image: dentalConsultation,
    },
    {
      id: 6,
      name: "Tooth Filling",
      description:
        "Restores a decayed or damaged tooth using materials like composite resin, amalgam, or porcelain.",
      appointments: 89,
      image: toothFilling,
    },
  ];

  const stats = [
    {
      label: "Total Services",
      value: services.length.toString(),
      icon: Stethoscope,
    },
    {
      label: "Active Appointments",
      value: services
        .reduce((acc, s) => acc + s.appointments, 0)
        .toString(),
      icon: Calendar,
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top App Header */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Services</h1>

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
        <div className="flex-1 overflow-y-auto px-8 pt-5 pb-8">
          {/* Section header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Services Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your dental services and appointments
              </p>
            </div>
            {/* Keeping the Add Service button behavior as-is; no hover changes requested here */}
            <button className="bg-[#30b8de] hover:bg-[#2bacd0] text-white rounded-lg h-[36px] px-5 text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            {stats.map((stat, index) => (
              <div
                key={index}
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

          {/* Services Grid */}
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
                      {/* Removed hover and transition classes */}
                      <button
                        className="p-2 text-gray-600 rounded-lg"
                        title="Edit"
                        aria-label="Edit"
                      />
                      <button
                        className="p-2 text-red-600 rounded-lg"
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
          </div>
          {/* End Services Grid */}
        </div>
      </main>
    </div>
  );
};

export default Services;
