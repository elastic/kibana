export declare function useFetchSLOSuggestions(): {
    suggestions: {
        tags: {
            label: string;
            value: string;
            count: number;
        }[];
    } | undefined;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
};
