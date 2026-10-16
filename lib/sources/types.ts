import { SeasonSnapshot } from "../domain/types";

/**
 * A data source supplies raw facts only. Everything derived (standings, Elo,
 * wRC+, playoff odds) lives in lib/analytics, so a real CPBL source can be
 * dropped in by implementing this interface.
 */
export interface CpblDataSource {
  readonly name: string;
  /** True when the data is generated rather than real; the UI shows a demo-data notice. */
  readonly simulated: boolean;
  loadSeason(year: number): Promise<SeasonSnapshot>;
}
