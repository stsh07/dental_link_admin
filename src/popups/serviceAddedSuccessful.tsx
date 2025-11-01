// src/popups/serviceAddedSuccessful.tsx
type ServiceAddedSuccessProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddedSuccessfully({
  open,
  onClose,
}: ServiceAddedSuccessProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[506px] bg-white rounded-[24px] shadow-lg p-8 md:p-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-[#30B8DE] text-[28px] md:text-[30px] font-bold leading-tight">
              Service Added Successfully!
            </h1>
            <p className="text-black text-[13px] leading-relaxed max-w-[377px] mx-auto">
              The new Service's information has been saved successfully. You can
              now view the record in the service list.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full max-w-[379px] h-[55px] bg-[#30B8DE] hover:bg-[#2aa3c5] transition-colors rounded-[22px] text-white text-[20px] font-semibold mt-4"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
