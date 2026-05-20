import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../../../typings';
interface Props {
    slo: SLOWithSummaryResponse;
    isActionsPopoverOpen: boolean;
    setIsActionsPopoverOpen: (value: boolean) => void;
    setIsAddRuleFlyoutOpen: (value: boolean) => void;
    setIsEditRuleFlyoutOpen: (value: boolean) => void;
    setDashboardAttachmentReady: (value: boolean) => void;
    rules?: Array<Rule<BurnRateRuleParams>>;
}
export declare function SloCardItemActions(props: Props): React.JSX.Element;
export {};
