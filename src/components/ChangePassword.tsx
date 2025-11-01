import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Sidebar from "./Sidebar";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const LOCAL_STORAGE_KEY = "dental-link-user";

const ChangePassword = (): JSX.Element => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setSuccess("");

    if (newPassword !== retypePassword) {
      setServerError("New password and re-typed password do not match.");
      return;
    }

    // get current user from localStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const user = raw ? JSON.parse(raw) : null;
    const email: string | undefined = user?.email;

    if (!email) {
      setServerError("Cannot find your account. Please re-login.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setServerError(data.message || data.error || "Failed to change password.");
        return;
      }

      setSuccess("Password has been updated.");
      setOldPassword("");
      setNewPassword("");
      setRetypePassword("");
    } catch (err: any) {
      setServerError(err?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-[720px] p-16">
          {/* Title */}
          <h2 className="text-2xl font-semibold text-cyan-500 mb-8">
            Change password
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Old Password */}
            <div>
              <label htmlFor="oldPassword" className="block text-sm text-gray-800 mb-2">
                Old password
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  id="oldPassword"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right mt-1">
                <span className="text-sm text-gray-400">Forgot password?</span>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm text-gray-800 mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Re-type Password */}
            <div>
              <label htmlFor="retypePassword" className="block text-sm text-gray-800 mb-2">
                Re-type password
              </label>
              <div className="relative">
                <input
                  type={showRetypePassword ? "text" : "password"}
                  id="retypePassword"
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRetypePassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showRetypePassword ? "Hide password" : "Show password"}
                >
                  {showRetypePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Messages */}
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={
                  loading ||
                  !oldPassword ||
                  !newPassword ||
                  !retypePassword ||
                  newPassword !== retypePassword
                }
                className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-colors disabled:opacity-60"
              >
                {loading ? "Saving..." : "Change password"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
