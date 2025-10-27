import { useState } from "react";

export default function AddDoctorPopup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    gender: "",
    address: "",
    phone: "",
    position: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErr("First name and Last name are required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("http://localhost:4000/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Backend currently requires firstName + lastName; other fields are sent for future use
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email || null,
          age: formData.age || null,
          gender: formData.gender || null,
          address: formData.address || null,
          phone: formData.phone || null,
          position: formData.position || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to create doctor");
      }

      setMsg("Doctor added successfully.");
      // notify list page (optional listener in Doctors.tsx)
      window.dispatchEvent(new CustomEvent("doctor:created"));

      // clear form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        age: "",
        gender: "",
        address: "",
        phone: "",
        position: "",
      });
    } catch (e: any) {
      setErr(e.message || "Failed to create doctor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[829px] bg-white">
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
        {/* First name and Last name row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              First name<span className="text-[#E63F3F]">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Juan"
              required
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Last name<span className="text-[#E63F3F]">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Dela Cruz"
              required
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="juandelacruz@email.com"
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
        </div>

        {/* Age (separate row) */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Age
          </label>
          <div className="relative">
            <select
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] text-black appearance-none focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent bg-white cursor-pointer"
            >
              <option value="">Select age</option>
              {Array.from({ length: 83 }, (_, i) => i + 18).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.33344 6.72168L2.14516e-07 1.34415L1.33312 0L6 4.70546L10.6669 0L12 1.34415L6.66656 6.72168C6.48976 6.89989 6.25 7 6 7C5.75 7 5.51024 6.89989 5.33344 6.72168Z"
                  fill="#30B8DE"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Gender (dropdown, only Male/Female) */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Gender
          </label>
          <div className="relative">
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] text-black appearance-none focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent bg-white cursor-pointer"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.33344 6.72168L2.14516e-07 1.34415L1.33312 0L6 4.70546L10.6669 0L12 1.34415L6.66656 6.72168C6.48976 6.89989 6.25 7 6 7C5.75 7 5.51024 6.89989 5.33344 6.72168Z"
                  fill="#30B8DE"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
        </div>

        {/* Phone (separate row) */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Phone
          </label>
          <div className="relative">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9123456789"
              className="w-full h-[44px] pl-16 pr-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[15px] text-black">+63</span>
              <div className="w-[2px] h-[23px] bg-[#D9D9D9]" />
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Position
          </label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="Head Dentist / General Dentistry"
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
        </div>

        {/* Messages */}
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}

        {/* Submit — CENTERED, MORE ROUNDED */}
        <div className="pt-2 sm:pt-4 flex justify-center">
          <button
            type="submit"
            disabled={submitting}
            className="min-w-[320px] h-[52px] rounded-full bg-[#30B8DE] text-white text-[16px] font-semibold hover:bg-[#2BA5C8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? "Adding…" : "Add doctor"}
          </button>
        </div>
      </form>
    </div>
  );
}
