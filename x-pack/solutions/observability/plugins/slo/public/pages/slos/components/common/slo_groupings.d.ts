import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface Props {
    slo: SLOWithSummaryResponse | undefined;
    direction?: 'column' | 'row';
    gutterSize?: 'none' | 's';
    truncate?: boolean;
}
export declare function SLOGroupings({ slo, direction, gutterSize, truncate }: Props): React.JSX.Element | null;
