import type { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../../../typings';
export interface SloListItemProps {
    slo: SLOWithSummaryResponse;
    rules?: Array<Rule<BurnRateRuleParams>>;
    historicalSummary?: HistoricalSummaryResponse[];
    historicalSummaryLoading: boolean;
    activeAlerts?: number;
    refetchRules: () => void;
}
export declare function SloListItem({ slo, rules, refetchRules, historicalSummary, historicalSummaryLoading, activeAlerts, }: SloListItemProps): React.JSX.Element;
