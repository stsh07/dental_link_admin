import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "../ProgressIndicator";
import dentalLinkLogo from "../../assets/dentalLink_logo.svg";
import {
  DISABLE_FORGOT_PASSWORD_API,
  simulateDelay,
} from "./config";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString()?.replace(/\/+$/, "") ||
  "http://localhost:4002";

const ForgotPasswordRequest: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      if (DISABLE_FORGOT_PASSWORD_API) {
        await simulateDelay();
      } else {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send verification code");
        }
      }

      sessionStorage.setItem("resetEmail", email);
      navigate("/forgot-password/verify");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
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
          <ProgressIndicator currentStep={1} totalSteps={3} />
        </div>

        <div className="w-full max-w-md text-center">
          <h1 className="text-[30px] font-bold text-[#3BB2E0] mb-3">
            Forgot Password?
          </h1>
          <p className="text-gray-600 mb-8 text-sm">
            Enter the email address associated with your account to receive a
            verification code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full max-w-sm mx-auto block px-3.5 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BB2E0] focus:border-transparent transition-colors"
                disabled={isLoading}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 text-left">{error}</p>
              )}
            </div>

            <div className="flex w-full max-w-sm mx-auto justify-between items-center gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border-2 border-[#3BB2E0] text-[#3BB2E0] rounded-full font-semibold text-sm hover:bg-[#3BB2E0] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="px-8 py-2 bg-[#3BB2E0] text-white rounded-full font-semibold text-sm hover:bg-[#2A9BC7] focus:ring-2 focus:ring-[#3BB2E0] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordRequest;
