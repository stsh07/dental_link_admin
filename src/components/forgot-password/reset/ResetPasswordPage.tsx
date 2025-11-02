import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "../../ProgressIndicator";
import dentalLinkLogo from "../../../assets/dentalLink_logo.svg";
import {
  DISABLE_FORGOT_PASSWORD_API,
  simulateDelay,
} from "../config";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const EyeIcon: React.FC<{ isVisible: boolean }> = ({ isVisible }) => (
  <svg className="h-4 w-4 text-[#3BB2E0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {isVisible ? (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
      </>
    ) : (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3.98 8.223C5.942 6.232 8.7 5.25 12 5.25c6 0 9.75 6.75 9.75 6.75a17.43 17.43 0 01-2.548 3.233"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M20.02 15.777C18.058 17.768 15.3 18.75 12 18.75c-6 0-9.75-6.75-9.75-6.75a17.345 17.345 0 012.548-3.232"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 00-3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18" />
      </>
    )}
  </svg>
);

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("resetEmail");
    if (!storedEmail) {
      navigate("/forgot-password", { replace: true });
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (DISABLE_FORGOT_PASSWORD_API) {
        await simulateDelay();
      } else {
        const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            newPassword: formData.newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to reset password");
        }
      }

      sessionStorage.removeItem("resetEmail");
      const searchParams = new URLSearchParams({
        message: "Password reset successfully. Please log in with your new password.",
      });
      navigate(`/?${searchParams.toString()}`, { replace: true });
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="w-full py-8 px-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2"
        >
          <img src={dentalLinkLogo} alt="dentalLink" className="h-5 w-auto" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-6">
        <div className="w-full max-w-md mt-8 mb-12">
          <ProgressIndicator currentStep={3} totalSteps={3} />
        </div>

        <div className="w-full max-w-md text-center">
          <h1 className="text-[30px] font-bold text-[#3BB2E0] mb-3">Reset Password</h1>
          <p className="text-gray-600 mb-8 text-sm">
            Enter a new password that is different from your previous one to keep your account secure.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 max-w-sm mx-auto text-left">
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#3BB2E0] focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
                {formData.newPassword && (
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center justify-center rounded-md p-1.5 text-[#3BB2E0] hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-[#3BB2E0]/40"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon isVisible={showNewPassword} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-w-sm mx-auto text-left">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#3BB2E0] focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
                {formData.confirmPassword && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center justify-center rounded-md p-1.5 text-[#3BB2E0] hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-[#3BB2E0]/40"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon isVisible={showConfirmPassword} />
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 text-left max-w-sm mx-auto">{error}</p>}

            <div className="w-full max-w-sm mx-auto pt-2">
              <button
                type="submit"
                disabled={
                  isLoading || !formData.newPassword || !formData.confirmPassword
                }
                className="w-full px-8 py-3 bg-[#3BB2E0] text-white rounded-full font-semibold text-sm hover:bg-[#2A9BC7] focus:ring-2 focus:ring-[#3BB2E0] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
