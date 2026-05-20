import type { SLODefinition } from '../models';
/**
 * A Burn Rate is computed with the sliValue retrieved from a specific lookback period
 * It tells how fast we are consumming our error budget during a specific period
 */
export declare function computeBurnRate(slo: SLODefinition, sliValue: number): number;
