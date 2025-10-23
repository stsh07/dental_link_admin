import { useState } from "react";

export default function AddDoctorForm() {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
            />
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
            placeholder="juandelacruz@email.com"
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
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
              className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] text-black appearance-none focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent bg-white cursor-pointer"
            >
              <option value="">Select age</option>
              {Array.from({ length: 83 }, (_, i) => i + 18).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
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

        {/* Gender */}
        <div>
          <label className="block text-[16px] font-normal mb-2 text-black">
            Gender<span className="text-[#E63F3F]">*</span>
          </label>
          <input
            type="text"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
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
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
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
            className="w-full h-[44px] px-4 rounded-lg border border-[#7C7C7C] text-[15px] placeholder:text-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
          />
        </div>

        {/* Submit — CENTERED & WIDER */}
        <div className="pt-2 sm:pt-4 flex justify-center">
          <button
            type="submit"
            className="min-w-[300px] sm:min-w-[320px] h-[48px] rounded-[92px] bg-[#30B8DE] text-white text-[16px] font-semibold hover:bg-[#2BA5C8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:ring-offset-2"
          >
            Add doctor
          </button>
        </div>
      </form>
    </div>
  );
}
