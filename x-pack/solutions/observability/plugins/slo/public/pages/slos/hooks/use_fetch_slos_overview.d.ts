import type { Filter } from '@kbn/es-query';
import type { GetSLOStatsOverviewResponse } from '@kbn/slo-schema/src/rest_specs/routes/get_slo_stats_overview';
import type { SearchState } from './use_url_search_state';
interface SLOsOverviewParams {
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
    data: GetSLOStatsOverviewResponse | undefined;
}
export declare function useFetchSLOsOverview({ kqlQuery, tagsFilter, statusFilter, filters: filterDSL, lastRefresh, }?: SLOsOverviewParams): UseFetchSloGroupsResponse;
export {};
