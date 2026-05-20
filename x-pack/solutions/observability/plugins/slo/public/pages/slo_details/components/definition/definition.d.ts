import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse;
}
export declare function Definition({ slo }: Props): React.JSX.Element;
