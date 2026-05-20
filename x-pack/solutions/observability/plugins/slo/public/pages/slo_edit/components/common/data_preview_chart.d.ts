import React from 'react';
interface DataPreviewChartProps {
    formatPattern?: string;
    threshold?: number;
    thresholdDirection?: 'above' | 'below';
    thresholdColor?: string;
    thresholdMessage?: string;
    ignoreMoreThan100?: boolean;
}
export declare function DataPreviewChart({ formatPattern, threshold, thresholdDirection, thresholdColor, thresholdMessage, ignoreMoreThan100, }: DataPreviewChartProps): React.JSX.Element;
export {};
