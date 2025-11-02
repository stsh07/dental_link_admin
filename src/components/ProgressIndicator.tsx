interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator = ({ currentStep, totalSteps }: ProgressIndicatorProps) => {
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="flex items-center space-x-0">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={stepNumber} className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "bg-[#3BB2E0] text-white"
                    : "border-2 border-[#3BB2E0] text-[#3BB2E0] bg-white"
                }`}
              >
                {stepNumber}
              </div>
              {stepNumber < totalSteps && (
                <div
                  className={`w-36 h-0.5 mx-0 ${isCompleted ? "bg-[#3BB2E0]" : "bg-gray-300"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;
