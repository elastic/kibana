import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { TimeBounds } from '../types';
import type { ChartData } from '../../../typings';
type ChartType = 'area' | 'line';
type State = 'success' | 'error';
export interface Props {
    id: string;
    data: ChartData[];
    chart: ChartType;
    state: State;
    isLoading: boolean;
    slo: SLOWithSummaryResponse;
    onBrushed?: (timeBounds: TimeBounds) => void;
}
export declare function WideChart({ chart, data, id, isLoading, state, onBrushed, slo }: Props): React.JSX.Element;
export {};
