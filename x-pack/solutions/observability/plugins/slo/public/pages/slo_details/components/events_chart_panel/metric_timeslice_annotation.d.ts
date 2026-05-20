import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse;
    maxValue?: number | null;
    minValue?: number | null;
}
export declare function MetricTimesliceAnnotation({ slo, maxValue, minValue }: Props): React.JSX.Element | null;
export {};
