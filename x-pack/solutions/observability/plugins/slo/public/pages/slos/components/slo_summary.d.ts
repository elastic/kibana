import React from 'react';
import type { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface Props {
    slo: SLOWithSummaryResponse;
    historicalSummary?: HistoricalSummaryResponse[];
    historicalSummaryLoading: boolean;
}
export declare function SloSummary({ slo, historicalSummary, historicalSummaryLoading }: Props): React.JSX.Element;
