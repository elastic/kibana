export declare const SLO_MANAGEMENT_SEARCH_URL_STORAGE_KEY = "search";
export declare const SLO_MANAGEMENT_SEARCH_SESSION_STORAGE_KEY = "slo.management_page_search_state";
export interface SearchState {
    search: string;
    tags: string[];
    page: number;
    perPage: number;
    includeOutdatedOnly?: boolean;
}
export declare const DEFAULT_STATE: SearchState;
export declare function useUrlSearchState(): {
    state: SearchState;
    onStateChange: (state: Partial<SearchState>) => void;
};
