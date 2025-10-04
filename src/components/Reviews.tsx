import Sidebar from "./Sidebar";
import { BellIcon } from "lucide-react";

const Reviews = (): JSX.Element => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top App Header with Bell only */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Reviews</h1>

          <div className="flex items-center gap-4">
            {/* Notification Icon */}
            <BellIcon className="w-5 h-5 text-gray-600" />
          </div>
        </header>

        {/* Content area (currently empty) */}
        <div className="flex-1 overflow-y-auto px-8 pt-8"></div>
      </main>
    </div>
  );
};

export default Reviews;
