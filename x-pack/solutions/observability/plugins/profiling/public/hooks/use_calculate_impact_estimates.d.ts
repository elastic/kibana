interface Params {
    countInclusive: number;
    countExclusive: number;
    totalSamples: number;
    totalSeconds: number;
}
export type CalculateImpactEstimates = ReturnType<typeof useCalculateImpactEstimate>;
export type ImpactEstimates = ReturnType<CalculateImpactEstimates>;
export declare const ANNUAL_SECONDS: number;
export declare function useCalculateImpactEstimate(): (params: Params) => {
    totalSamples: {
        percentage: number;
        coreSeconds: number;
        annualizedCoreSeconds: number;
    };
    totalCPU: {
        percentage: number;
        coreSeconds: number;
        annualizedCoreSeconds: number;
    };
    selfCPU: {
        percentage: number;
        coreSeconds: number;
        annualizedCoreSeconds: number;
    };
};
export {};
