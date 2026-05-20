import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse;
}
export declare function SyntheticsIndicatorOverview({ slo }: Props): React.JSX.Element | null;
export {};
