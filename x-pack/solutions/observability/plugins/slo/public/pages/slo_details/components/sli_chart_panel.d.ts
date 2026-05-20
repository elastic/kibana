import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { ChartData } from '../../../typings/slo';
import type { TimeBounds } from '../types';
export interface Props {
    slo: SLOWithSummaryResponse;
    data: ChartData[];
    isLoading: boolean;
    timeRange?: {
        from: string;
        to: string;
    };
    hideHeaderDurationLabel?: boolean;
    onBrushed?: (timeBounds: TimeBounds) => void;
}
export declare function SliChartPanel({ slo, data, isLoading, timeRange, hideHeaderDurationLabel, onBrushed, }: Props): React.JSX.Element;
