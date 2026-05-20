import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import type { ActionGroupIdsOf, AlertInstanceContext as AlertContext, AlertInstanceState as AlertState } from '@kbn/alerting-plugin/common';
import type { ALERT_ACTION, HIGH_PRIORITY_ACTION, MEDIUM_PRIORITY_ACTION, LOW_PRIORITY_ACTION, SUPPRESSED_PRIORITY_ACTION } from '../../../../common/constants';
export declare enum AlertStates {
    OK = 0,
    ALERT = 1
}
export interface WindowSchema {
    id: string;
    burnRateThreshold: number;
    maxBurnRateThreshold: number | null;
    longWindow: {
        value: number;
        unit: string;
    };
    shortWindow: {
        value: number;
        unit: string;
    };
    actionGroup: string;
}
interface Dependency {
    ruleId: string;
    actionGroupsToSuppressOn: string[];
}
export type BurnRateRuleParams = {
    sloId: string;
    windows: WindowSchema[];
    dependencies?: Dependency[];
} & Record<string, any>;
export type BurnRateRuleTypeState = RuleTypeState;
export type BurnRateAlertState = AlertState;
export type BurnRateAlertContext = AlertContext;
export type BurnRateAllowedActionGroups = ActionGroupIdsOf<typeof ALERT_ACTION | typeof HIGH_PRIORITY_ACTION | typeof MEDIUM_PRIORITY_ACTION | typeof LOW_PRIORITY_ACTION | typeof SUPPRESSED_PRIORITY_ACTION>;
export interface Group {
    field: string;
    value: string;
}
export {};
