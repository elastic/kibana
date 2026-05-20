import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { TimeRange } from './use_lens_definition';
export declare function getLensDefinitionInterval(dataTimeRange: TimeRange, slo: SLOWithSummaryResponse): string;
