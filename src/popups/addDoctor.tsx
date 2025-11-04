import { useState, useRef } from "react";
import AddedSuccessfully from "./addedsuccessfully";

const API_BASE = "http://localhost:4002";

type FieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "age"
  | "gender"
  | "address"
  | "phone"
  | "position";

type Errors = Partial<Record<FieldKey, string>>;

export default function AddDoctorPopup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    gender: "",
    address: "",
    phone: "", // 10 digits only, starts with 9
    position: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onEditClear = (k: FieldKey) => () => setErrors((p) => ({ ...p, [k]: "" }));

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  function computeErrors(fd: typeof formData): Errors {
    const e: Errors = {};

    if (!fd.firstName.trim()) e.firstName = "This field is required";
    if (!fd.lastName.trim()) e.lastName = "This field is required";

    if (!fd.email.trim()) {
      e.email = "This field is required";
    } else if (!emailOk(fd.email)) {
      e.email = "Email must include '@' and a domain name (e.g., user@example.com)";
    }

    if (!fd.age) e.age = "This field is required";
    if (!fd.gender) e.gender = "Please select gender";
    if (!fd.address.trim()) e.address = "This field is required";

    if (!fd.phone.trim()) {
      e.phone = "This field is required";
    } else {
      const digits = fd.phone.replace(/\D/g, "");
      if (!/^9\d{9}$/.test(digits)) {
        e.phone = "Phone must start with 9 and contain 10 digits";
      }
    }

    if (!fd.position.trim()) e.position = "This field is required";
    return e;
  }

  const fieldCls = (k: FieldKey) =>
    `w-full h-[44px] px-4 rounded-lg border text-[15px] placeholder:text-[#D9D9D9] focus:outline-none ${
      errors[k]
        ? "border-[#E63F3F] focus:ring-2 focus:ring-[#E63F3F]/20"
        : "border-[#7C7C7C] focus:ring-2 focus:ring-[#30B8DE]"
    }`;

  const selectCls = (k: FieldKey) =>
    `w-full h-[44px] px-4 rounded-lg border text-[15px] bg-white appearance-none cursor-pointer focus:outline-none ${
      errors[k]
        ? "border-[#E63F3F] focus:ring-2 focus:ring-[#E63F3F]/20"
        : "border-[#7C7C7C] focus:ring-2 focus:ring-[#30B8DE]"
    }`;

  const Hint = ({ k }: { k: FieldKey }) =>
    errors[k] ? <p className="mt-1 text-[12px] text-[#E63F3F]">{errors[k]}</p> : null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as { name: FieldKey; value: string };

    if (name === "phone") {
      // allow only digits; max 10; UI shows +63 separately
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setFormData((s) => ({ ...s, phone: digits }));
      setErrors((p) => ({ ...p, phone: "" }));
      return;
    }

    setFormData((s) => ({ ...s, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" } as Errors));
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

    const errs = computeErrors(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const order: FieldKey[] = [
        "firstName",
        "lastName",
        "email",
        "age",
        "gender",
        "address",
        "phone",
        "position",
      ];
      for (const k of order) {
        if (errs[k]) {
          const el = document.getElementsByName(k)[0] as HTMLElement | undefined;
          if (el) el.focus();
          break;
        }
      }
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("firstName", formData.firstName.trim());
      fd.append("lastName", formData.lastName.trim());
      fd.append("email", formData.email.trim());
      fd.append("age", formData.age);
      fd.append("gender", formData.gender);
      fd.append("address", formData.address.trim());
      // send exactly the 10 digits (starts with 9). Server/DB screenshot uses this format.
      fd.append("phone", formData.phone);
      fd.append("position", formData.position.trim());
      if (profileFile) fd.append("profile", profileFile);

      const res = await fetch(`${API_BASE}/api/doctors`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create doctor");

      setMsg("Doctor added successfully.");

      window.dispatchEvent(new Event("doctors-updated"));
      window.dispatchEvent(new Event("appointments-updated"));
      window.dispatchEvent(new Event("doctor:created"));

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
      setErrors({});
      setProfileFile(null);
      setProfilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowSuccess(true);
    } catch (e: any) {
      setErr(e.message || "Failed to create doctor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-[829px] bg-white">
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7" noValidate>
          {/* Photo */}
          <div className="flex flex-col items-center">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border overflow-hidden flex items-center justify-center ${
                profilePreview ? "border-gray-200 bg-white" : "border-gray-300 bg-gray-100"
              }`}
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
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

          {/* Names */}
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
                onInput={onEditClear("firstName")}
                placeholder="Juan"
                aria-invalid={!!errors.firstName}
                className={fieldCls("firstName")}
              />
              <Hint k="firstName" />
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
                onInput={onEditClear("lastName")}
                placeholder="Dela Cruz"
                aria-invalid={!!errors.lastName}
                className={fieldCls("lastName")}
              />
              <Hint k="lastName" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Email<span className="text-[#E63F3F]">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onInput={onEditClear("email")}
              placeholder="juandelacruz@email.com"
              aria-invalid={!!errors.email}
              className={fieldCls("email")}
            />
            <Hint k="email" />
          </div>

          {/* Age */}
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Age<span className="text-[#E63F3F]">*</span>
            </label>
            <div className="relative">
              <select
                name="age"
                value={formData.age}
                onChange={handleChange}
                onInput={onEditClear("age")}
                aria-invalid={!!errors.age}
                className={selectCls("age")}
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
            <Hint k="age" />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Gender<span className="text-[#E63F3F]">*</span>
            </label>
            <div className="relative">
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                onInput={onEditClear("gender")}
                aria-invalid={!!errors.gender}
                className={selectCls("gender")}
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
            <Hint k="gender" />
          </div>

          {/* Address */}
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Address<span className="text-[#E63F3F]">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              onInput={onEditClear("address")}
              aria-invalid={!!errors.address}
              className={fieldCls("address")}
            />
            <Hint k="address" />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Phone<span className="text-[#E63F3F]">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onInput={onEditClear("phone")}
                placeholder="9123456789"
                aria-invalid={!!errors.phone}
                className={`pl-16 pr-4 ${fieldCls("phone")}`}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[15px] text-black">+63</span>
                <div className="w-[2px] h-[23px] bg-[#D9D9D9]" />
              </div>
            </div>
            <Hint k="phone" />
          </div>

          {/* Position */}
          <div>
            <label className="block text-[16px] font-normal mb-2 text-black">
              Position<span className="text-[#E63F3F]">*</span>
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              onInput={onEditClear("position")}
              placeholder="Head Dentist / General Dentistry"
              aria-invalid={!!errors.position}
              className={fieldCls("position")}
            />
            <Hint k="position" />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}

          <div className="pt-2 sm:pt-4 flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="w-[480px] h-[56px] rounded-full bg-[#30B8DE] text-white text-[16px] font-semibold hover:bg-[#2BA5C8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? "Adding…" : "Add doctor"}
            </button>
          </div>
        </form>
      </div>

      <AddedSuccessfully open={showSuccess} onClose={() => setShowSuccess(false)} />
    </>
  );
}
