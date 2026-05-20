import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    sloList: SLOWithSummaryResponse[];
    loading: boolean;
    error: boolean;
}
export declare function SloListCompactView({ sloList, loading, error }: Props): React.JSX.Element;
