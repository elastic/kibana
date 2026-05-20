import { type SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { TimeBounds } from '../../types';
export interface Props {
    slo: SLOWithSummaryResponse;
    range: {
        from: Date;
        to: Date;
    };
    dynamicTimeRange?: boolean;
    onBrushed?: (timeBounds: TimeBounds) => void;
}
export declare function EventsChartPanel({ slo, range, dynamicTimeRange, onBrushed }: Props): React.JSX.Element;
