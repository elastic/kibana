import type { TimeRange } from '@kbn/es-query';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare const getTimeRange: (slo: SLOWithSummaryResponse) => TimeRange;
