import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Sidebar from "./Sidebar";

const ChangePassword = (): JSX.Element => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Change password submitted", {
      oldPassword,
      newPassword,
      retypePassword,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-cyan-500 mb-8">
              Change password
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Old Password */}
              <div>
                <label
                  htmlFor="oldPassword"
                  className="block text-sm font-normal text-gray-900 mb-2"
                >
                  Old password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                  <a href="#" className="text-sm text-gray-400 hover:text-gray-600">
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-normal text-gray-900 mb-2"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                <label
                  htmlFor="retypePassword"
                  className="block text-sm font-normal text-gray-900 mb-2"
                >
                  Re-type password
                </label>
                <div className="relative">
                  <input
                    type={showRetypePassword ? "text" : "password"}
                    id="retypePassword"
                    value={retypePassword}
                    onChange={(e) => setRetypePassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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

              {/* Actions */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-2.5 rounded transition-colors disabled:opacity-60"
                  disabled={!oldPassword || !newPassword || newPassword !== retypePassword}
                >
                  Change password
                </button>
              </div>

              {/* Validation message */}
              {newPassword && retypePassword && newPassword !== retypePassword && (
                <p className="text-sm text-red-600">
                  New password and re-typed password do not match.
                </p>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
