import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface Props {
    slo: SLOWithSummaryResponse;
}
export declare function SLOCardItemInstanceBadge({ slo }: Props): React.JSX.Element | null;
