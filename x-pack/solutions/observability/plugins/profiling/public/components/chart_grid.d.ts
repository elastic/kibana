import React from 'react';
import type { TopNSubchart } from '../../common/topn';
export interface ChartGridProps {
    limit: number;
    charts: TopNSubchart[];
    showFrames: boolean;
    onChartClick?: (selectedChart: TopNSubchart) => void;
}
export declare function ChartGrid({ limit, charts, showFrames, onChartClick }: ChartGridProps): React.JSX.Element;
