import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse;
    isAutoRefreshing?: boolean;
}
export declare function BurnRatePanel({ slo, isAutoRefreshing }: Props): React.JSX.Element;
export {};
