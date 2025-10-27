// src/popups/DocApptTable.tsx
type ActiveRow = {
    patient: string;
    procedure: string;
    date: string;
    time: string;
    status: string;
  };
  
  type HistoryRow = {
    patient: string;
    procedure: string;
    date: string;
    time: string;
    review: string;
  };
  
  type Props = {
    tab: "active" | "history";
    activeData: ActiveRow[];
    historyData: HistoryRow[];
  };
  
  export default function DocApptTable({ tab, activeData, historyData }: Props) {
    const isActive = tab === "active";
    const hasRows = isActive ? activeData.length > 0 : historyData.length > 0;
  
    return (
      <div className="overflow-x-auto">
        <div className="min-w-full border-4 border-gray-200 rounded-md">
          <table className="w-full bg-white rounded-md overflow-hidden">
            <thead className="border-b border-gray-300">
              <tr className="bg-white">
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold">Patient</th>
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold">Procedure</th>
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold">Date</th>
                <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold">Time</th>
                {isActive ? (
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold">Status</th>
                ) : (
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold">Review</th>
                )}
              </tr>
            </thead>
  
            <tbody>
              {hasRows ? (
                isActive ? (
                  activeData.map((a, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.patient}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.procedure}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.date}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.time}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.status}</td>
                    </tr>
                  ))
                ) : (
                  historyData.map((a, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.patient}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.procedure}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.date}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.time}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs">{a.review}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-6 text-sm text-gray-500 text-center">
                    {isActive ? "No active appointments." : "No appointment history."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  