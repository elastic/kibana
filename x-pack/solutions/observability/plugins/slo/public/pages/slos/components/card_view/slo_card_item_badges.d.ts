import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../../../typings';
interface Props {
    activeAlerts?: number;
    slo: SLOWithSummaryResponse;
    rules: Array<Rule<BurnRateRuleParams>> | undefined;
    handleCreateRule?: () => void;
}
export declare function SloCardItemBadges({ slo, activeAlerts, rules, handleCreateRule }: Props): React.JSX.Element;
export {};
