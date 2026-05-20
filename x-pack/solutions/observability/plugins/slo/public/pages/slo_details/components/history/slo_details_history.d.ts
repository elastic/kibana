import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse;
}
export declare function SloDetailsHistory({ slo }: Props): React.JSX.Element;
