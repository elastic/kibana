import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { ViewType } from '../types';
export interface Props {
    sloList: SLOWithSummaryResponse[];
    loading: boolean;
    error: boolean;
    view: ViewType;
}
export declare function SlosView({ sloList, loading, error, view }: Props): React.JSX.Element;
