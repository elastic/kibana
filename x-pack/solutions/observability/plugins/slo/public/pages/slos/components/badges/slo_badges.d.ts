import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import type { BurnRateRuleParams } from '../../../../typings';
export type ViewMode = 'default' | 'compact';
export interface SloBadgesProps {
    activeAlerts?: number;
    isLoading: boolean;
    rules: Array<Rule<BurnRateRuleParams>> | undefined;
    slo: SLOWithSummaryResponse;
    onClickRuleBadge: () => void;
}
export declare function SloBadges({ activeAlerts, isLoading, rules, slo, onClickRuleBadge, }: SloBadgesProps): React.JSX.Element;
export declare function LoadingBadges(): React.JSX.Element;
