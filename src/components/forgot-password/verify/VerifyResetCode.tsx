import React, { useEffect, useRef, useState } from "react";
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

const VerifyResetCode: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("resetEmail");
    if (!storedEmail) {
      navigate("/forgot-password", { replace: true });
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, "");
    setCode(newCode);
    setError("");

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const newCode = [...code];

    for (let i = 0; i < pastedData.length; i += 1) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);
    const nextIndex = Math.min(pastedData.length, 3);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");

    if (verificationCode.length !== 4) {
      setError("Please enter the complete 4-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (DISABLE_FORGOT_PASSWORD_API) {
        await simulateDelay();
      } else {
        const response = await fetch(`${API_BASE}/api/auth/verify-reset-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code: verificationCode,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Invalid verification code");
        }
      }

      navigate("/forgot-password/reset");
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError("");

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
          throw new Error(data.error || "Failed to resend code");
        }
      }

      setResendCooldown(60);
      timerRef.current = window.setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Resend error:", err);
      setError(err instanceof Error ? err.message : "Failed to resend code");
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
          <ProgressIndicator currentStep={2} totalSteps={3} />
        </div>

        <div className="w-full max-w-md text-center">
          <h1 className="text-[30px] font-bold text-[#3BB2E0] mb-3">Email Verification</h1>
          <p className="text-gray-600 mb-8 text-sm">
            Enter the 4-digit code we sent to your email address.
          </p>

          <div className="flex justify-center gap-3 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={digit}
                onChange={(event) => handleInputChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                className="w-14 h-14 text-center text-xl font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-[#3BB2E0] focus:border-transparent transition-colors"
                maxLength={1}
                disabled={isLoading}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <div className="mb-10 text-sm text-gray-600">
            <p>
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className="text-[#3BB2E0] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
              </button>
            </p>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || code.join("").length !== 4}
              className="w-full px-8 py-3 bg-[#3BB2E0] text-white rounded-full font-semibold text-sm hover:bg-[#2A9BC7] focus:ring-2 focus:ring-[#3BB2E0] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyResetCode;
