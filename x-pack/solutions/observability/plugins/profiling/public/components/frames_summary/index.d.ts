import React from 'react';
interface FrameValue {
    totalCount: number;
    scaleFactor?: number;
    totalAnnualCO2Kgs: number;
    totalAnnualCostUSD: number;
}
interface Props {
    baseValue?: FrameValue;
    comparisonValue?: FrameValue;
    isLoading: boolean;
    hasBorder?: boolean;
    compressed?: boolean;
}
export declare function FramesSummary({ baseValue, comparisonValue, isLoading, hasBorder, compressed, }: Props): React.JSX.Element;
export {};
