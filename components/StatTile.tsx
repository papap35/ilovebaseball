export default function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-black tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-slate-400">{note}</div>}
    </div>
  );
}
