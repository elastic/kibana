import React from 'react';
import type { TopNSubchart } from '../../../common/topn';
export interface StackedBarChartProps {
    height: number;
    asPercentages: boolean;
    onBrushEnd: (range: {
        rangeFrom: string;
        rangeTo: string;
    }) => void;
    charts: TopNSubchart[];
    showFrames: boolean;
    onClick?: (selectedChart: TopNSubchart) => void;
}
export declare function StackedBarChart({ height, asPercentages, onBrushEnd, charts, showFrames, onClick, }: StackedBarChartProps): React.JSX.Element;
