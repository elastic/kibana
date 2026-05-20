export declare const useGetSettings: () => {
    isLoading: boolean;
    data: {
        useAllRemoteClusters: boolean;
        selectedRemoteClusters: string[];
        staleThresholdInHours: number;
        staleInstancesCleanupEnabled: boolean;
    } | undefined;
};
