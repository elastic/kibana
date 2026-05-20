import type { FetchHistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface UseFetchHistoricalSummaryResponse {
    data: FetchHistoricalSummaryResponse | undefined;
    isInitialLoading: boolean;
    isRefetching: boolean;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export interface Params {
    sloList: SLOWithSummaryResponse[];
    shouldRefetch?: boolean;
    range?: {
        from: Date;
        to: Date;
    };
}
export declare function useFetchHistoricalSummary({ sloList, shouldRefetch, range, }: Params): UseFetchHistoricalSummaryResponse;
