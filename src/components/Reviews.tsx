import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { BellIcon, FileText, Calendar, Search, Filter } from "lucide-react";
import profile from "../assets/profile.svg";

interface ApiReview {
  id: number;
  appointmentId: number;
  dentistId: number;
  userEmail: string;
  reviewText: string;
  createdAt: string;
  patientName?: string | null;
  doctorName?: string | null;
}

interface Review {
  customer_name: string;
  doctor: string;
  review_text: string;
  review_date: string;
}

const Reviews = (): JSX.Element => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");

  // change this if your API is on a different port
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4002";

  /* --------------------------------------------------
     1) fetch reviews from backend
  -------------------------------------------------- */
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reviews`, {
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Failed to fetch /api/reviews", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (data.ok && Array.isArray(data.reviews)) {
          // map API shape to UI shape
          const mapped: Review[] = data.reviews.map((r: ApiReview) => ({
            customer_name: r.patientName && r.patientName.trim().length > 0 ? r.patientName : r.userEmail,
            doctor: r.doctorName && r.doctorName.trim().length > 0 ? r.doctorName : `Doctor #${r.dentistId}`,
            review_text: r.reviewText,
            review_date: r.createdAt,
          }));

          setReviews(mapped);
          setFilteredReviews(mapped);
        } else {
          setReviews([]);
          setFilteredReviews([]);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [API_BASE]);

  /* --------------------------------------------------
     2) re-filter whenever search/doctor/reviews changes
  -------------------------------------------------- */
  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, selectedDoctor]);

  const filterReviews = () => {
    let filtered = [...reviews];
    const q = searchTerm.toLowerCase();

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          r.review_text.toLowerCase().includes(q) ||
          r.doctor.toLowerCase().includes(q)
      );
    }

    if (selectedDoctor !== "all") {
      filtered = filtered.filter((r) => r.doctor === selectedDoctor);
    }

    setFilteredReviews(filtered);
  };

  const formatDate = (dateString: string) => {
    // MySQL DATETIME → JS Date
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      // fallback if it's e.g. "2025-10-31 14:31:26"
      return dateString;
    }
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // stats
  const stats = [
    { label: "Total Reviews", value: reviews.length.toString(), icon: FileText },
    {
      label: "Latest Review",
      // backend already sends DESC, but we also sort here just in case
      value:
        reviews.length > 0
          ? formatDate(
              [...reviews].sort(
                (a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
              )[0].review_date
            )
          : "N/A",
      icon: Calendar,
    },
  ];

  // dynamic doctor list from data
  const doctorList = [
    "all",
    ...Array.from(new Set(reviews.map((r) => r.doctor).filter(Boolean))),
  ];

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-gray-600 font-medium">Loading reviews...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Doctor Reviews</h1>
          <BellIcon className="w-5 h-5 text-gray-600" />
        </header>

        <div className="flex-1 overflow-y-auto px-8 pt-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-cyan-400"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>

                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: "rgba(48, 184, 222, 0.3)" }}
                    >
                      <stat.icon className="w-6 h-6" style={{ color: "#3165DC" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + Filter */}
            <div className="bg-white rounded-lg border border-[#c4c4c4] shadow p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by patient name, review content, or doctor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                  />
                </div>
                <div className="relative min-w-[220px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none appearance-none bg-white"
                  >
                    {doctorList.map((doctor) => (
                      <option key={doctor} value={doctor}>
                        {doctor === "all" ? "All Doctors" : doctor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-[#c4c4c4] bg-white shadow">
              <div className="p-0 overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[45%]" />
                    <col className="w-[17%]" />
                  </colgroup>

                  <thead>
                    <tr className="border-b">
                      {["Patient Name", "Doctor", "Review", "Date"].map((head) => (
                        <th
                          key={head}
                          className={`text-sm md:text-base font-bold text-gray-900 py-3 ${
                            head === "Patient Name" ? "pl-8 text-left" : "px-4 text-left"
                          }`}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredReviews.map((r, i) => (
                      <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 pl-8 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            <img
                              src={profile}
                              alt={`${r.customer_name} profile`}
                              className="w-9 h-9 rounded-full bg-white object-cover"
                            />
                            <span className="truncate">{r.customer_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">{r.doctor}</td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">
                          {r.review_text}
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm truncate">
                          {formatDate(r.review_date)}
                        </td>
                      </tr>
                    ))}

                    {filteredReviews.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No reviews found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reviews;
