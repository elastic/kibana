import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    slo: SLOWithSummaryResponse;
    hideTitle?: boolean;
    hideHeaderDurationLabel?: boolean;
    setDashboardAttachmentReady?: (value: boolean) => void;
}
export declare function ErrorBudgetHeader({ slo, hideTitle, hideHeaderDurationLabel, setDashboardAttachmentReady, }: Props): React.JSX.Element;
export {};
