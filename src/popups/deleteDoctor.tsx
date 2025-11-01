type Props = {
    onCancel?: () => void;
    onConfirm?: () => void;
    loading?: boolean;
  };
  
  export default function DeleteDoctor({ onCancel, onConfirm, loading }: Props) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-xl shadow-lg w-full max-w-[551px] p-8 md:p-12"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-[32px] md:text-[40px] font-semibold text-[#E63F3F] leading-tight">
            Delete Doctor
          </h1>
  
          <p className="text-base md:text-[16px] font-semibold text-[#373737] leading-normal">
            Are you sure you want to remove doctor?
          </p>
  
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full pt-4">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 min-w-[160px] h-[59px] rounded-[14px] border border-[#7C7C7C] bg-white text-[#7C7C7C] text-2xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              No
            </button>
  
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 min-w-[160px] h-[59px] rounded-[14px] bg-[#30B8DE] text-white text-2xl font-semibold hover:bg-[#2ba3c7] transition-colors disabled:opacity-60"
            >
              {loading ? "Deleting…" : "Yes"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  