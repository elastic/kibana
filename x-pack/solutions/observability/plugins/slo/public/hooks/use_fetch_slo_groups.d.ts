import type { Filter } from '@kbn/es-query';
import type { FindSLOGroupsResponse } from '@kbn/slo-schema';
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import type { GroupByField } from '../pages/slos/types';
import type { SearchState } from '../pages/slos/hooks/use_url_search_state';
interface SLOGroupsParams {
    page?: number;
    perPage?: number;
    groupBy?: GroupByField;
    groupsFilter?: string[];
    kqlQuery?: string;
    tagsFilter?: SearchState['tagsFilter'];
    statusFilter?: SearchState['statusFilter'];
    filters?: Filter[];
    lastRefresh?: number;
}
interface UseFetchSloGroupsResponse {
    isLoading: boolean;
    isRefetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    data: FindSLOGroupsResponse | undefined;
    refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<FindSLOGroupsResponse | undefined, unknown>>;
}
export declare function useFetchSloGroups({ page, perPage, groupBy, groupsFilter, kqlQuery, tagsFilter, statusFilter, filters: filterDSL, lastRefresh, }?: SLOGroupsParams): UseFetchSloGroupsResponse;
export {};
