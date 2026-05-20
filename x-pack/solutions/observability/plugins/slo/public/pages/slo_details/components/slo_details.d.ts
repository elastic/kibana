import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { SloTabId } from '@kbn/deeplinks-observability';
import React from 'react';
export interface Props {
    slo: SLOWithSummaryResponse;
    isAutoRefreshing: boolean;
    selectedTabId: SloTabId;
}
export declare function SloDetails({ slo, isAutoRefreshing, selectedTabId }: Props): React.JSX.Element;
