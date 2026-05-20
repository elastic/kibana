import React from 'react';
export declare function TooltipRow({ value, label, comparison, formatDifferenceAsPercentage, showDifference, formatValue, prependValue, }: {
    value: number;
    label: string | React.ReactElement;
    comparison?: number;
    formatDifferenceAsPercentage: boolean;
    showDifference: boolean;
    formatValue?: (value: number) => string;
    prependValue?: string;
}): React.JSX.Element;
