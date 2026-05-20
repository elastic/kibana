import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
export declare function BurnRateRuleFlyout({ slo, isAddRuleFlyoutOpen, canChangeTrigger, setIsAddRuleFlyoutOpen, }: {
    slo?: SLOWithSummaryResponse;
    isAddRuleFlyoutOpen: boolean;
    canChangeTrigger?: boolean;
    setIsAddRuleFlyoutOpen?: (value: boolean) => void;
}): React.JSX.Element | null;
