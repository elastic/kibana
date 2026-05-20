import React from 'react';
import type { CalculateImpactEstimates } from '../../hooks/use_calculate_impact_estimates';
interface Params {
    countInclusive: number;
    countExclusive: number;
    totalSamples: number;
    totalSeconds: number;
    calculateImpactEstimates: CalculateImpactEstimates;
    selfAnnualCO2Kgs: number;
    totalAnnualCO2Kgs: number;
    selfAnnualCostUSD: number;
    totalAnnualCostUSD: number;
    rank?: number;
}
export interface ImpactRow {
    'data-test-subj': string;
    label: React.ReactNode;
    value: string;
}
/**
 * e.g.:
 * label: 'foo',
 * value: 'abc' vs 'xyz'
 */
export declare function getComparisonImpactRow({ base, comparison, }: {
    base: Params;
    comparison?: Params;
}): ({
    value: string;
    'data-test-subj': string;
    label: React.ReactNode;
} | {
    'data-test-subj': string;
    label: string;
    value: string | number;
})[];
export declare function getImpactRows({ countInclusive, countExclusive, totalSamples, totalSeconds, calculateImpactEstimates, selfAnnualCO2Kgs, totalAnnualCO2Kgs, selfAnnualCostUSD, totalAnnualCostUSD, }: Params): ImpactRow[];
export {};
