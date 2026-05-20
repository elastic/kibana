import type { GetSLOBurnRatesResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
export interface UseFetchSloBurnRatesResponse {
    isLoading: boolean;
    data: GetSLOBurnRatesResponse | undefined;
    refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<GetSLOBurnRatesResponse | undefined, unknown>>;
}
interface UseFetchSloBurnRatesParams {
    slo: SLOWithSummaryResponse;
    windows: Array<{
        name: string;
        duration: string;
    }>;
    shouldRefetch?: boolean;
}
export declare function useFetchSloBurnRates({ slo, windows, shouldRefetch, }: UseFetchSloBurnRatesParams): UseFetchSloBurnRatesResponse;
export {};
