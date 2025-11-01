// src/popups/deleteService.tsx
type Props = {
  open: boolean;
  serviceName?: string;
  loading?: boolean;
  onYes: () => void;
  onNo: () => void;
};

export default function DeleteService({
  open,
  serviceName = "this service",
  loading = false,
  onYes,
  onNo,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70 p-4">
      <div className="w-full max-w-[551px] bg-white rounded-xl shadow-lg p-8 md:p-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-red-500 font-semibold text-3xl sm:text-4xl leading-none">
            Delete Service
          </h1>
          <p className="text-[#373737] font-semibold text-base sm:text-lg">
            Are you sure you want to remove{" "}
            <span className="text-[#00A0C6]">{serviceName}</span>?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
            <button
              onClick={onNo}
              disabled={loading}
              className="flex-1 min-w-[190px] h-[59px] rounded-[14px] border border-[#7C7C7C] text-[#7C7C7C] font-semibold text-2xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              No
            </button>
            <button
              onClick={onYes}
              disabled={loading}
              className="flex-1 min-w-[190px] h-[59px] rounded-[14px] bg-[#30b8de] text-white font-semibold text-2xl hover:bg-[#2bacd0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Deleting..." : "Yes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
