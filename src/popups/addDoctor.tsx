import { useState, useRef } from "react";

const API_BASE = "http://localhost:4002";

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

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setProfileFile(null);
      setProfilePreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setErr("Please upload an image file.");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr("Image must be 5MB or less.");
      e.target.value = "";
      return;
    }
    setErr(null);
    setProfileFile(f);
    const reader = new FileReader();
    reader.onload = () => setProfilePreview(reader.result as string);
    reader.readAsDataURL(f);
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
      const fd = new FormData();
      fd.append("firstName", formData.firstName.trim());
      fd.append("lastName", formData.lastName.trim());
      if (formData.email) fd.append("email", formData.email);
      if (formData.age) fd.append("age", formData.age);
      if (formData.gender) fd.append("gender", formData.gender);
      if (formData.address) fd.append("address", formData.address);
      if (formData.phone) fd.append("phone", formData.phone);
      if (formData.position) fd.append("position", formData.position);
      if (profileFile) fd.append("profile", profileFile); // <-- file

      const res = await fetch(`${API_BASE}/api/doctors`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create doctor");

      setMsg("Doctor added successfully.");

      // ✅ notify list page(s)
      window.dispatchEvent(new Event("doctors-updated"));
      window.dispatchEvent(new Event("appointments-updated"));
      window.dispatchEvent(new Event("doctor:created")); // legacy name supported by Doctors.tsx

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
      setProfileFile(null);
      setProfilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      setErr(e.message || "Failed to create doctor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[829px] bg-white">
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
        {/* ===== Centered Profile Upload ===== */}
        <div className="flex flex-col items-center">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
            {profilePreview ? (
              <img
                src={profilePreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">No photo</span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Wider, white with blue stroke (#30B8DE) */}
            <button
              type="button"
              onClick={handlePickFile}
              className="min-w-[180px] px-8 py-2 text-sm font-semibold rounded-lg border border-[#30B8DE] text-[#30B8DE] bg-white hover:bg-[#E8F7FC] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]/40 transition-colors"
            >
              Upload
            </button>

            {profileFile && (
              <button
                type="button"
                onClick={() => {
                  setProfileFile(null);
                  setProfilePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* First name and Last name */}
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
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]"
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
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="juandelacruz@email.com"
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">Age</label>
          <div className="relative">
            <select
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] text-black appearance-none focus:outline-none focus:ring-2 focus:ring-[#30B8DE] bg-white cursor-pointer"
            >
              <option value="">Select age</option>
              {Array.from({ length: 83 }, (_, i) => i + 18).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.333 6.722 0 1.344 1.333 0 6 4.705 10.667 0 12 1.344 6.667 6.722A.993.993 0 0 1 6 7a.993.993 0 0 1-.667-.278Z"
                  fill="#30B8DE"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">Gender</label>
          <div className="relative">
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] text-black appearance-none focus:outline-none focus:ring-2 focus:ring-[#30B8DE] bg-white cursor-pointer"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.333 6.722 0 1.344 1.333 0 6 4.705 10.667 0 12 1.344 6.667 6.722A.993.993 0 0 1 6 7a.993.993 0 0 1-.667-.278Z"
                  fill="#30B8DE"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">Phone</label>
          <div className="relative">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="9123456789"
              className="w-full h-[44px] pl-16 pr-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[15px] text-black">+63</span>
              <div className="w-[2px] h-[23px] bg-[#D9D9D9]" />
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">Position</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="Head Dentist / General Dentistry"
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE]"
          />
        </div>

        {/* Messages */}
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}

        {/* Submit */}
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
