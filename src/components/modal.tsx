import React, { useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showDivider?: boolean;
  headerSlot?: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title = "Modal",
  children,
  showDivider = false,
  headerSlot,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = orig;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-black/40" />

      {/* Dialog */}
      <div
        className="
          relative
          mx-4 sm:mx-6           /* ⬅️ more horizontal margin from viewport */
          my-10                  /* ⬅️ more vertical margin from viewport */
          w-full max-w-[720px]
          rounded-2xl            /* ⬅️ slightly larger corner radius */
          bg-white shadow-2xl
        "
      >
        {/* Header */}
        <div
          className={`
            flex items-center justify-between
            px-6 py-4            /* ⬅️ more internal padding in header */
            ${showDivider ? "border-b border-gray-100" : ""}
          `}
        >
          <div className="min-w-0">
            {headerSlot ? (
              headerSlot
            ) : (
              <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
