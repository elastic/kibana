import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { TimeBounds } from '../types';
export interface Props {
    slo: SLOWithSummaryResponse;
    isAutoRefreshing: boolean;
    range?: {
        from: Date;
        to: Date;
    };
    onBrushed?: (timeBounds: TimeBounds) => void;
    hideHeaderDurationLabel?: boolean;
}
export declare function HistoricalDataCharts({ slo, range, isAutoRefreshing, onBrushed, hideHeaderDurationLabel, }: Props): React.JSX.Element;
