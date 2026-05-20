import type { FetchSLOHealthResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface UseFetchSloHealth {
    data: FetchSLOHealthResponse | undefined;
    isLoading: boolean;
    isError: boolean;
}
export interface Params {
    list: SLOWithSummaryResponse[];
}
export declare function useFetchSloHealth({ list }: Params): UseFetchSloHealth;
