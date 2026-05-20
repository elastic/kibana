import { type StackFrameMetadata, type TopNFunctions } from '@kbn/profiling-utils';
import type { CalculateImpactEstimates, ImpactEstimates } from '../../hooks/use_calculate_impact_estimates';
export declare function getColorLabel(percent: number): {
    color: string;
    label: string;
    icon: undefined;
} | {
    color: string;
    label: string;
    icon: string;
} | {
    color: string;
    label: undefined;
    icon: undefined;
};
export declare function scaleAndRoundValue({ value, scaleFactor, }: {
    value: number;
    scaleFactor?: number;
}): number;
export declare const getTotalCount: (topNFunctions?: TopNFunctions) => number;
export interface IFunctionRow {
    id: string;
    rank: number;
    frame: StackFrameMetadata;
    samples: number;
    selfCPU: number;
    totalCPU: number;
    selfCPUPerc: number;
    totalCPUPerc: number;
    impactEstimates?: ImpactEstimates;
    selfAnnualCO2kgs: number;
    selfAnnualCostUSD: number;
    totalAnnualCO2kgs: number;
    totalAnnualCostUSD: number;
    subGroups?: Record<string, number>;
    diff?: {
        rank: number;
        samples: number;
        selfCPU: number;
        totalCPU: number;
        selfCPUPerc: number;
        totalCPUPerc: number;
        impactEstimates?: ImpactEstimates;
        selfAnnualCO2kgs: number;
        selfAnnualCostUSD: number;
        totalAnnualCO2kgs: number;
        totalAnnualCostUSD: number;
    };
}
export declare function getFunctionsRows({ baselineScaleFactor, comparisonScaleFactor, comparisonTopNFunctions, topNFunctions, totalSeconds, calculateImpactEstimates, functionNameSearchQuery, }: {
    baselineScaleFactor?: number;
    comparisonScaleFactor?: number;
    comparisonTopNFunctions?: TopNFunctions;
    topNFunctions?: TopNFunctions;
    totalSeconds: number;
    calculateImpactEstimates: CalculateImpactEstimates;
    functionNameSearchQuery: string;
}): IFunctionRow[];
export declare function calculateBaseComparisonDiff({ baselineValue, baselineScaleFactor, comparisonValue, comparisonScaleFactor, formatValue, }: {
    baselineValue: number;
    baselineScaleFactor?: number;
    comparisonValue: number;
    comparisonScaleFactor?: number;
    formatValue?: (value: number) => string;
}): {
    baseValue: string;
    comparisonValue?: undefined;
    percentDiffDelta?: undefined;
    color?: undefined;
    icon?: undefined;
    label?: undefined;
} | {
    baseValue: string;
    comparisonValue: string;
    percentDiffDelta: number;
    color: string;
    icon: string | undefined;
    label: string | undefined;
};
export declare function convertRowToFrame(row: IFunctionRow): {
    addressOrLine: number;
    countExclusive: number;
    countInclusive: number;
    exeFileName: string;
    fileID: string;
    frameType: import("@kbn/profiling-utils").FrameType;
    functionName: string;
    sourceFileName: string;
    sourceLine: number;
    selfAnnualCO2Kgs: number;
    totalAnnualCO2Kgs: number;
    selfAnnualCostUSD: number;
    totalAnnualCostUSD: number;
    subGroups: Record<string, number> | undefined;
};
