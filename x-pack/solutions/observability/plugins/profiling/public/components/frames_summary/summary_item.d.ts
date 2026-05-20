import React from 'react';
interface Props {
    id: string;
    title: string;
    isLoading: boolean;
    baseValue: string;
    baseIcon?: string;
    baseColor?: string;
    comparisonValue?: string;
    comparisonPerc?: string;
    comparisonIcon?: string;
    comparisonColor?: string;
    titleHint?: string;
    hasBorder?: boolean;
    compressed?: boolean;
}
export declare function getValueLable(value: string, perc?: string): string;
export declare function SummaryItem({ id, baseValue, baseColor, comparisonValue, title, isLoading, comparisonPerc, comparisonColor, titleHint, hasBorder, compressed, }: Props): React.JSX.Element;
export {};
