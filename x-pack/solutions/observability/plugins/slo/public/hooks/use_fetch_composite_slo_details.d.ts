export declare function useFetchCompositeSloDetails(ids: string[]): {
    detailsById: Map<string, {
        id: string;
        name: string;
        description: string;
        compositeMethod: "weightedAverage";
        timeWindow: {
            duration: string;
            type: "rolling";
        };
        budgetingMethod: "occurrences";
        objective: {
            target: number;
        };
        tags: string[];
        enabled: boolean;
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        updatedBy: string;
        version: number;
        summary: {
            sliValue: number;
            errorBudget: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            };
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            fiveMinuteBurnRate: number;
            oneHourBurnRate: number;
            oneDayBurnRate: number;
        };
        members: {
            id: string;
            name: string;
            weight: number;
            normalisedWeight: number;
            sliValue: number;
            status: "NO_DATA" | "HEALTHY" | "DEGRADING" | "VIOLATED";
            errorBudget?: {
                initial: number;
                consumed: number;
                remaining: number;
                isEstimated: boolean;
            } | undefined;
            fiveMinuteBurnRate?: number | undefined;
            oneHourBurnRate?: number | undefined;
            oneDayBurnRate?: number | undefined;
            instanceId?: string | undefined;
        }[];
    }>;
    isLoading: boolean;
};
