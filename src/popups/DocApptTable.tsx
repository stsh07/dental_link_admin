type ActiveRow = {
  patient: string;
  procedure: string;
  date: string;
  time: string;
  status: "Approved" | "Pending";
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
  onReviewClick?: (row: HistoryRow) => void;
};

function StatusPill({ value }: { value: "Approved" | "Pending" | string }) {
  const cls =
    value === "Approved"
      ? "bg-green-100 text-green-700"
      : value === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${cls}`}>
      {value}
    </span>
  );
}

export default function DocApptTable({
  tab,
  activeData,
  historyData,
  onReviewClick,
}: Props) {
  const isActive = tab === "active";
  const hasRows = isActive ? activeData.length > 0 : historyData.length > 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full border-4 border-gray-200 rounded-md">
        <table className="w-full bg-white rounded-md overflow-hidden">
          <thead className="border-b border-gray-300">
            <tr className="bg-white">
              <th className="text-left px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold">Patient</th>
              <th className="text-left px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold">Procedure</th>
              <th className="text-left px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold">Date</th>
              <th className="text-left px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold">Time</th>
              {isActive ? (
                <th className="text-left px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold">Status</th>
              ) : (
                <th className="text-left px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold">Review</th>
              )}
            </tr>
          </thead>

          <tbody>
            {hasRows ? (
              isActive ? (
                activeData.map((a, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.patient}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.procedure}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.date}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.time}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">
                      <StatusPill value={a.status} />
                    </td>
                  </tr>
                ))
              ) : (
                historyData.map((a, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.patient}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.procedure}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.date}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">{a.time}</td>
                    <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs">
                      {a.review ? (
                        <button
                          type="button"
                          onClick={() => onReviewClick && onReviewClick(a)}
                          className="text-[#2bacd0] underline-offset-2 hover:underline text-xs text-left"
                        >
                          {a.review.length > 35 ? a.review.slice(0, 35) + "..." : a.review}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No review</span>
                      )}
                    </td>
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
