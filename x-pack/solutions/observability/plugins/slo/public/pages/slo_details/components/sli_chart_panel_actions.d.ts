import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface SliChartPanelActionsProps {
    slo: SLOWithSummaryResponse;
    timeRange?: {
        from: string;
        to: string;
    };
}
export declare function SliChartPanelActions({ slo, timeRange }: SliChartPanelActionsProps): React.JSX.Element;
export {};
