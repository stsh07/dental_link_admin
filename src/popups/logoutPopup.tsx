type Props = {
    onCancel?: () => void;
    onConfirm?: () => void;
    loading?: boolean;
  };
  
  export default function LogoutPopup({ onCancel, onConfirm, loading }: Props) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[402px] bg-white rounded-[9px] border border-[#C4C4C4] p-8 sm:p-10"
      >
        <h2 className="text-xl text-black font-normal leading-[150%] tracking-[-0.38px] mb-8">
          Are you sure you want to log out?
        </h2>
  
        <div className="flex gap-3 sm:gap-[13px] flex-col sm:flex-row">
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-[150px] h-[37px] flex items-center justify-center rounded-[9px] border border-[#C4C4C4] bg-white text-black text-base leading-[150%] tracking-[-0.304px] hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            NO
          </button>
  
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-[150px] h-[37px] flex items-center justify-center rounded-[9px] border border-[#C4C4C4] bg-[#30B8DE] text-white text-base leading-[150%] tracking-[-0.304px] hover:bg-[#2AA5CA] transition-colors disabled:opacity-60"
          >
            {loading ? "Logging out…" : "YES"}
          </button>
        </div>
      </div>
    );
  }
  