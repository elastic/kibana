import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { TimeBounds } from '../../../pages/slo_details/types';
import type { AlertAnnotation, TimeRange } from './use_lens_definition';
interface Props {
    slo: SLOWithSummaryResponse;
    dataTimeRange: TimeRange;
    threshold?: number;
    alertTimeRange?: TimeRange;
    annotations?: AlertAnnotation[];
    onBrushed?: (timeBounds: TimeBounds) => void;
    variant?: 'success' | 'danger';
}
export declare function ErrorRateChart({ slo, dataTimeRange, threshold, alertTimeRange, annotations, onBrushed, variant, }: Props): React.JSX.Element;
export {};
