import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { ChartData } from '../../../typings/slo';
import type { TimeBounds } from '../types';
export interface Props {
    data: ChartData[];
    isLoading: boolean;
    slo: SLOWithSummaryResponse;
    onBrushed?: (timeBounds: TimeBounds) => void;
}
export declare function ErrorBudgetChart({ data, isLoading, slo, onBrushed }: Props): React.JSX.Element;
