export interface Suggestion {
    label: string;
    value: string;
    count: number;
}
export interface UseFetchSyntheticsSuggestions {
    suggestions: Suggestion[];
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export interface Params {
    fieldName: string;
    filters?: {
        locations?: string[];
        monitorIds?: string[];
        tags?: string[];
        projects?: string[];
    };
    search: string;
}
export declare function useFetchSyntheticsSuggestions({ filters, fieldName, search, }: Params): UseFetchSyntheticsSuggestions;
