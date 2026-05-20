import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse;
    duration: string;
    lastRefreshTime?: number;
}
export declare function SimpleBurnRate({ slo, duration, lastRefreshTime }: Props): React.JSX.Element;
export {};
