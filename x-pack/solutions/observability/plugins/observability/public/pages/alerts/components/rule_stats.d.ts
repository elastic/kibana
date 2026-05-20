import React from 'react';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { RulesLocatorParams } from '@kbn/rule-data-utils';
export interface RuleStatsState {
    total: number;
    disabled: number;
    muted: number;
    error: number;
    snoozed: number;
}
export declare const renderRuleStats: (ruleStats: RuleStatsState, manageRulesHref: string, ruleStatsLoading: boolean, rulesLocator?: LocatorPublic<RulesLocatorParams>) => React.JSX.Element[];
