import React from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface SloStatusProps {
    slo: SLOWithSummaryResponse;
    isLoading?: boolean;
}
interface StatusHealth {
    displayText: string;
    badgeColor: string;
}
type SLOStatus = 'HEALTHY' | 'DEGRADING' | 'VIOLATED' | 'NO_DATA';
export declare const displayStatus: Record<SLOStatus, StatusHealth>;
export declare function SloStatusBadge({ slo, isLoading }: SloStatusProps): React.JSX.Element;
export {};
