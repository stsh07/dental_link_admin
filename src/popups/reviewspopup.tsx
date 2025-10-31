type ReviewPopupProps = {
    open: boolean;
    onClose: () => void;
    patient?: string;
    review?: string;
  };
  
  export default function ReviewPopup({
    open,
    onClose,
    patient,
    review,
  }: ReviewPopupProps) {
    if (!open) return null;
  
    const title = patient?.trim() ? patient : "Patient review";
    const text =
      review?.trim() ||
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
  
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-[720px]">
          <div className="relative bg-white rounded-[18px] shadow-sm p-8 sm:p-10 lg:p-12">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                viewBox="0 0 14 14"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 1L1 13M1 1L13 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
  
            <h1 className="text-[26px] font-semibold text-[#2BACD0] mb-6">
              {title}
            </h1>
  
            <div className="bg-[#D9D9D9] border border-[#C4C4C4] rounded-[9px] p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-black whitespace-pre-line">
                {text}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  