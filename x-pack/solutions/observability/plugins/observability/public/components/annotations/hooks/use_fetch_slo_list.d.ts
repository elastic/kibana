import type { FindSLOResponse } from '@kbn/slo-schema';
export interface SLOListParams {
    kqlQuery?: string;
    page?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    perPage?: number;
    lastRefresh?: number;
    disabled?: boolean;
}
export interface UseFetchSloListResponse {
    isInitialLoading: boolean;
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    data: FindSLOResponse | undefined;
}
export declare function useFetchSloList({ kqlQuery, page, sortBy, sortDirection, perPage, lastRefresh, disabled, }?: SLOListParams): UseFetchSloListResponse;
