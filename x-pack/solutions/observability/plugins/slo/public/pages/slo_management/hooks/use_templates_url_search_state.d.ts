export declare const SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY = "search";
export interface TemplatesSearchState {
    search: string;
    tags: string[];
    page: number;
    perPage: number;
}
export declare const DEFAULT_STATE: TemplatesSearchState;
export declare function useTemplatesUrlSearchState(): {
    state: TemplatesSearchState;
    onStateChange: (state: Partial<TemplatesSearchState>) => void;
};
