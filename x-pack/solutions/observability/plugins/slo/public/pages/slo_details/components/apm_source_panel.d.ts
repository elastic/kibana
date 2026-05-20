import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface ApmSourcePanelProps {
    slo: SLOWithSummaryResponse;
    timeRange?: {
        from: string;
        to: string;
    };
}
export declare function ApmSourcePanel({ slo, timeRange }: ApmSourcePanelProps): React.JSX.Element | null;
export {};
