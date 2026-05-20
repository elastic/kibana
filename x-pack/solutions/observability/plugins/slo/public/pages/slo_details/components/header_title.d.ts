import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export interface Props {
    slo?: SLOWithSummaryResponse;
    isLoading: boolean;
}
export declare function HeaderTitle({ isLoading, slo }: Props): React.JSX.Element;
