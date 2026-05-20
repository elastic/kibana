import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse | SLODefinitionResponse;
}
export declare function SloTimeWindowBadge({ slo }: Props): React.JSX.Element;
