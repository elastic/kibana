import type { Filter } from '@kbn/es-query';
import type { FindSLOResponse } from '@kbn/slo-schema';
import type { SearchState } from '../pages/slos/hooks/use_url_search_state';
import type { SortDirection, SortField } from '../pages/slos/types';
export interface SLOListParams {
    kqlQuery?: string;
    page?: number;
    sortBy?: SortField;
    sortDirection?: SortDirection;
    perPage?: number;
    filters?: Filter[];
    lastRefresh?: number;
    tagsFilter?: SearchState['tagsFilter'];
    statusFilter?: SearchState['statusFilter'];
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
export declare function useFetchSloList({ kqlQuery, page, sortBy, sortDirection, perPage, filters: filterDSL, lastRefresh, tagsFilter, statusFilter, disabled, }?: SLOListParams): UseFetchSloListResponse;
