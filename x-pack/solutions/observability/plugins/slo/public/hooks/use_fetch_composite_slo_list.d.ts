import type { FindCompositeSLOResponse } from '@kbn/slo-schema';
export type CompositeSloSortBy = 'name' | 'createdAt' | 'updatedAt';
export type CompositeSloSortDirection = 'asc' | 'desc';
interface CompositeSLOListParams {
    page?: number;
    perPage?: number;
    search?: string;
    tags?: string;
    sortBy?: CompositeSloSortBy;
    sortDirection?: CompositeSloSortDirection;
    status?: string;
}
export interface UseFetchCompositeSloListResponse {
    data: FindCompositeSLOResponse | undefined;
    isInitialLoading: boolean;
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export declare function useFetchCompositeSloList({ page, perPage, search, tags, sortBy, sortDirection, status, }?: CompositeSLOListParams): UseFetchCompositeSloListResponse;
export {};
