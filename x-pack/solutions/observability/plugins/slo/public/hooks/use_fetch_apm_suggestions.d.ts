export type Suggestion = string;
export interface UseFetchApmSuggestions {
    suggestions: Suggestion[];
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export interface Params {
    fieldName: string;
    search?: string;
    serviceName?: string;
}
export declare function useFetchApmSuggestions({ fieldName, search, serviceName, }: Params): UseFetchApmSuggestions;
