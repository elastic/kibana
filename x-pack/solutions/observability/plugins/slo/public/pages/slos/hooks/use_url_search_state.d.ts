import type { Filter } from '@kbn/es-query';
import type { GroupByField, SortDirection, SortField, ViewType } from '../types';
export declare const SLO_LIST_SEARCH_URL_STORAGE_KEY = "search";
export declare const SLO_LIST_SEARCH_SESSION_STORAGE_KEY = "slo.list_page_search_state";
export interface SearchState {
    kqlQuery: string;
    page: number;
    perPage: number;
    sort: {
        by: SortField;
        direction: SortDirection;
    };
    view: ViewType;
    groupBy: GroupByField;
    filters: Filter[];
    lastRefresh?: number;
    tagsFilter?: Filter;
    statusFilter?: Filter;
}
export declare const DEFAULT_STATE: SearchState;
export declare function useUrlSearchState(): {
    state: SearchState;
    onStateChange: (state: Partial<SearchState>) => void;
};
