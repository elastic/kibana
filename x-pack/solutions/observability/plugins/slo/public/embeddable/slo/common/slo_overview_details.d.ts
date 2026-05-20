import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import type { SloTabId } from '@kbn/deeplinks-observability';
export interface SloOverviewDetailsContentProps {
    slo: SLOWithSummaryResponse;
    initialTabId?: SloTabId;
}
export declare function SloOverviewDetailsContent({ slo, initialTabId, }: SloOverviewDetailsContentProps): React.JSX.Element;
export interface SloOverviewDetailsFlyoutFooterProps {
    slo: SLOWithSummaryResponse;
    onClose: () => void;
}
export declare function SloOverviewDetailsFlyoutFooter({ slo, onClose, }: SloOverviewDetailsFlyoutFooterProps): React.JSX.Element;
export declare function SloOverviewDetails({ slo, setSelectedSlo, }: {
    slo: SLOWithSummaryResponse | null;
    setSelectedSlo: (slo: SLOWithSummaryResponse | null) => void;
}): React.JSX.Element | null;
