import Sidebar from "./Sidebar";
import { BellIcon, SearchIcon } from "lucide-react";

const Reviews = (): JSX.Element => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top App Header with Search + Bell */}
        <header className="h-[72px] bg-white shadow-sm px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-black text-[28px] font-semibold">Reviews</h1>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-[320px] h-10 bg-white rounded-full border border-[#d9d9d9] shadow-inner flex items-center px-4">
              <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
              <input
                placeholder="Search"
                className="border-0 outline-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 h-auto p-0 w-full"
              />
            </div>

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
