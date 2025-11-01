// src/components/LoginPage.tsx
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dentalLinkLogo from "../assets/dentalLink_logo.svg";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const STORAGE_KEY = "dental-link-user";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      // ✅ backend returns { message, token, user }
      // so we check for res.ok AND data.token
      if (res.ok && data.token) {
        // save user
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...data.user,
            token: data.token, // keep token too
          })
        );

        // go to dashboard
        navigate("/dashboard");
      } else {
        // show backend message or generic
        setError(
          data.error === "Invalid credentials" ||
            data.error === "INVALID_CREDENTIALS"
            ? "Invalid email or password"
            : data.error || data.message || "Login failed"
        );
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* left form */}
          <div className="md:basis-[65%] p-10 md:p-14 flex items-center justify-center">
            <div className="w-full max-w-md">
              <img src={dentalLinkLogo} alt="dentalLink" className="h-4 w-auto mb-8" />

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Welcome back!
              </h1>
              <p className="text-gray-600 mt-1 mb-8">Sign in to your account</p>

              {/* Error */}
              {error && (
                <div className="mb-4 text-red-500 text-sm font-medium">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-black mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="admin@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-black mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30B8DE] focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <a href="#" className="text-sm text-gray-500 hover:text-[#30B8DE]">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#30B8DE] hover:bg-[#29A3C8] text-white py-3 rounded-full font-medium transition-colors disabled:opacity-70"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </div>
          </div>

          {/* right image */}
          <div className="md:basis-[35%]">
            <div className="h-60 md:h-full w-full overflow-hidden md:rounded-l-none rounded-b-3xl md:rounded-b-none md:rounded-r-3xl">
              <img
                src="/src/assets/picture ni doctor dapat and patient.svg"
                alt="Dental examination"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
