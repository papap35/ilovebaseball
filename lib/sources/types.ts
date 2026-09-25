import { SeasonSnapshot } from "../domain/types";

/**
 * A data source supplies raw facts only. Everything derived (standings, Elo,
 * wRC+, playoff odds) lives in lib/analytics, so a real CPBL source can be
 * dropped in by implementing this one method.
 */
export interface CpblDataSource {
  readonly name: string;
  loadSeason(year: number): Promise<SeasonSnapshot>;
}
