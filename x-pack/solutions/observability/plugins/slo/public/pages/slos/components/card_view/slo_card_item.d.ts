import type { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../../../typings';
export interface Props {
    slo: SLOWithSummaryResponse;
    rules: Array<Rule<BurnRateRuleParams>> | undefined;
    historicalSummary?: HistoricalSummaryResponse[];
    historicalSummaryLoading: boolean;
    activeAlerts?: number;
    loading: boolean;
    error: boolean;
    refetchRules: () => void;
}
export declare const useSloCardColor: (status?: SLOWithSummaryResponse["summary"]["status"]) => {
    cardColor: string;
    colors: {
        DEGRADING: string;
        VIOLATED: string;
        HEALTHY: string;
        NO_DATA: string;
    };
};
export declare const getSubTitle: (slo: SLOWithSummaryResponse) => string;
export declare function SloCardItem({ slo, rules, activeAlerts, historicalSummary, refetchRules }: Props): React.JSX.Element;
export declare function SloCardChart({ slo, badges, onClick, historicalSliData, }: {
    badges: React.ReactNode;
    slo: SLOWithSummaryResponse;
    historicalSliData?: Array<{
        key?: number;
        value?: number;
    }>;
    onClick?: () => void;
}): React.JSX.Element;
