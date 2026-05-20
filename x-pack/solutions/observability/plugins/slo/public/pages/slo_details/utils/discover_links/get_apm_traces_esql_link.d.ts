import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { type SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { SloEventType } from '../../types';
export declare function getApmTracesEsqlLink({ slo, timeRange, discover, transactionIndex, }: {
    slo: SLOWithSummaryResponse;
    timeRange: TimeRange;
    discover?: DiscoverStart;
    transactionIndex: string;
}): string | undefined;
export declare function navigateToApmTracesEsqlLink({ slo, timeRange, discover, transactionIndex, selectedEventType, }: {
    slo: SLOWithSummaryResponse;
    timeRange: TimeRange;
    discover?: DiscoverStart;
    transactionIndex: string;
    selectedEventType?: SloEventType;
}): void;
