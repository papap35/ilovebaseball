import { isDemoData } from "@/lib/sources";

export default function DemoBanner() {
  if (!isDemoData()) return null;

  return (
    <div role="note" className="border-b border-amber-300 bg-amber-100 text-amber-950">
      <p className="mx-auto max-w-6xl px-4 py-2 text-sm sm:px-6">
        <strong className="font-bold">示範資料</strong>
        <span className="mx-2 text-amber-700" aria-hidden="true">
          |
        </span>
        本站的戰績、球員數據與預測全部由模擬生成，並非中華職棒的實際賽果。
      </p>
    </div>
  );
}
