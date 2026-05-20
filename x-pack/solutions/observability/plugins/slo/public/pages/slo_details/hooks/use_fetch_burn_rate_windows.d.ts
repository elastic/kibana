import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Duration } from '../../../typings';
export interface BurnRateWindow {
    name: string;
    threshold: number;
    longWindow: Duration;
    shortWindow: Duration;
}
export declare const DEFAULT_BURN_RATE_WINDOWS: BurnRateWindow[];
export declare const useFetchBurnRateWindows: (slo: SLOWithSummaryResponse) => BurnRateWindow[];
