import React from 'react';
interface Props {
    annualCO2KgsInclusive: number;
    annualCostsUSDInclusive: number;
    baselineScaleFactor?: number;
    comparisonAnnualCO2KgsInclusive?: number;
    comparisonAnnualCostsUSDInclusive?: number;
    comparisonCountExclusive?: number;
    comparisonCountInclusive?: number;
    comparisonScaleFactor?: number;
    comparisonTotalSamples?: number;
    comparisonTotalSeconds?: number;
    countExclusive: number;
    countInclusive: number;
    inline: boolean;
    isRoot: boolean;
    label: string;
    onShowMoreClick?: () => void;
    parentLabel?: string;
    totalSamples: number;
    totalSeconds: number;
}
declare function FlameGraphTooltipComponent({ annualCO2KgsInclusive, annualCostsUSDInclusive, baselineScaleFactor, comparisonAnnualCO2KgsInclusive, comparisonAnnualCostsUSDInclusive, comparisonCountExclusive, comparisonCountInclusive, comparisonScaleFactor, comparisonTotalSamples, comparisonTotalSeconds, countExclusive, countInclusive, inline, isRoot, label, onShowMoreClick, parentLabel, totalSamples, totalSeconds, }: Props): React.JSX.Element;
export declare const FlameGraphTooltip: React.MemoExoticComponent<typeof FlameGraphTooltipComponent>;
export {};
