import type { EuiLoadingChartSize } from '@elastic/eui/src/components/loading/loading_chart';
import React from 'react';
interface Props {
    isInitialLoad: boolean;
    height?: number;
    width?: number;
    iconSize?: EuiLoadingChartSize;
    children: React.ReactNode;
}
export declare function ChartContainer({ isInitialLoad, children, iconSize, height, }: Props): React.JSX.Element;
export {};
