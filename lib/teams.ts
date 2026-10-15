import { Team, TeamId } from "./domain/types";

export type { Team, TeamId };

export const TEAMS: Team[] = [
  {
    id: "brothers",
    name: "中信兄弟",
    short: "兄弟",
    city: "台中",
    venue: "洲際棒球場",
    color: "#ca8a04",
    colorSoft: "#fef3c7",
  },
  {
    id: "lions",
    name: "統一7-ELEVEn獅",
    short: "統一獅",
    city: "台南",
    venue: "台南棒球場",
    color: "#ea580c",
    colorSoft: "#ffedd5",
  },
  {
    id: "monkeys",
    name: "樂天桃猿",
    short: "桃猿",
    city: "桃園",
    venue: "樂天桃園棒球場",
    color: "#db2777",
    colorSoft: "#fce7f3",
  },
  {
    id: "guardians",
    name: "富邦悍將",
    short: "悍將",
    city: "台北",
    venue: "新莊棒球場",
    color: "#b91c1c",
    colorSoft: "#fee2e2",
  },
  {
    id: "dragons",
    name: "味全龍",
    short: "味全龍",
    city: "台北",
    venue: "天母棒球場",
    color: "#059669",
    colorSoft: "#d1fae5",
  },
  {
    id: "hawks",
    name: "台鋼雄鷹",
    short: "雄鷹",
    city: "高雄",
    venue: "澄清湖棒球場",
    color: "#2563eb",
    colorSoft: "#dbeafe",
  },
];

export function getTeam(id: string): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}
