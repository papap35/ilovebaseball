import { Team } from "@/lib/teams";

export default function TeamBadge({
  team,
  size = "md",
}: {
  team: Team;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-base" }[
    size
  ];
  return (
    <span
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full font-black text-white`}
      style={{ backgroundColor: team.color }}
      title={team.name}
    >
      {team.short.slice(0, 2)}
    </span>
  );
}
