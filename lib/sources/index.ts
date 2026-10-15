import { createSimulatedSource } from "./simulated";
import { CpblDataSource } from "./types";

export type { CpblDataSource };

export const SEASON_YEAR = 2026;
/** Snapshot date the demo season is frozen at. */
export const SEASON_AS_OF = "2026-09-15";

const source: CpblDataSource = createSimulatedSource(SEASON_AS_OF);

export function getDataSource(): CpblDataSource {
  return source;
}
