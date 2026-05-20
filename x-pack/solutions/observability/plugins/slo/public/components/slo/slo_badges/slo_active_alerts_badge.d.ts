import { type SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    viewMode?: 'compact' | 'default';
    activeAlerts?: number;
    slo: SLOWithSummaryResponse;
}
export declare function SloActiveAlertsBadge({ slo, activeAlerts, viewMode }: Props): React.JSX.Element | null;
