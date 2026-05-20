import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface SloStatusProps {
    slo: SLOWithSummaryResponse;
    isLoading?: boolean;
}
export declare function SloValueBadge({ slo, isLoading }: SloStatusProps): React.JSX.Element;
