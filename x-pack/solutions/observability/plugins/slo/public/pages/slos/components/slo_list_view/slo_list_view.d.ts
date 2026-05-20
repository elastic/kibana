import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    sloList: SLOWithSummaryResponse[];
    loading: boolean;
    error: boolean;
}
export declare function SloListView({ sloList, loading, error }: Props): React.JSX.Element;
