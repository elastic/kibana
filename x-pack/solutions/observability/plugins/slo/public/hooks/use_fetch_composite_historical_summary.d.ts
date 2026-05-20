export declare function useFetchCompositeHistoricalSummary(compositeIds: string[]): {
    historicalSummaryById: Map<string, {
        date: string;
        status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
        sliValue: number;
        errorBudget: {
            initial: number;
            consumed: number;
            remaining: number;
            isEstimated: boolean;
        };
    }[]>;
    isLoading: boolean;
    isError: boolean;
};
