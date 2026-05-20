import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse;
}
export declare function SloIndicatorTypeBadge({ slo }: Props): React.JSX.Element;
