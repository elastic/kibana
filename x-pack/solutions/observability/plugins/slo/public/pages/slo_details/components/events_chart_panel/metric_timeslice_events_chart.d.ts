import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { TimeBounds } from '../../types';
import type { GetPreviewDataResponseResults } from './types';
interface Props {
    data: GetPreviewDataResponseResults;
    slo: SLOWithSummaryResponse;
    onBrushed?: (timeBounds: TimeBounds) => void;
}
export declare function MetricTimesliceEventsChart({ slo, data, onBrushed }: Props): React.JSX.Element | null;
export {};
