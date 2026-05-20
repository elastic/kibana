import type { ActionGroupIdsOf, AlertInstanceContext as AlertContext, AlertInstanceState as AlertState, RecoveredActionGroup, RuleTypeState } from '@kbn/alerting-plugin/common';
import type { ObservabilityMetricsAlert } from '@kbn/alerts-as-data-utils';
import type { ALERT_EVALUATION_THRESHOLD, ALERT_EVALUATION_TIME_RANGE, ALERT_EVALUATION_VALUES, ALERT_GROUP, ALERT_GROUPING } from '@kbn/rule-data-utils';
import type { Group } from '../../../../common/typings';
import type { CustomMetricExpressionParams, SearchConfigurationWithExtractedReferenceType } from '../../../../common/custom_threshold_rule/types';
import type { FIRED_ACTIONS_ID, NO_DATA_ACTIONS_ID, FIRED_ACTION, NO_DATA_ACTION } from './constants';
import type { MissingGroupsRecord } from './lib/check_missing_group';
export declare enum AlertStates {
    OK = 0,
    ALERT = 1,
    NO_DATA = 2,
    ERROR = 3
}
export type RuleTypeParams = Record<string, unknown>;
export interface CustomThresholdRuleTypeParams extends RuleTypeParams {
    criteria: CustomMetricExpressionParams[];
    searchConfiguration: SearchConfigurationWithExtractedReferenceType;
    groupBy?: string | string[];
    alertOnNoData: boolean;
    alertOnGroupDisappear?: boolean;
}
export type CustomThresholdRuleTypeState = RuleTypeState & {
    lastRunTimestamp?: number;
    missingGroups?: MissingGroupsRecord[];
    groupBy?: string | string[];
    searchConfiguration?: SearchConfigurationWithExtractedReferenceType;
};
export type CustomThresholdAlertState = AlertState;
export type CustomThresholdAlertContext = AlertContext & {
    alertDetailsUrl: string;
    group?: object;
    grouping?: Record<string, any>;
    reason?: string;
    timestamp: string;
    value?: Array<number | string | null>;
};
export type CustomThresholdSpecificActionGroups = ActionGroupIdsOf<typeof FIRED_ACTION | typeof NO_DATA_ACTION>;
export type CustomThresholdActionGroup = typeof FIRED_ACTIONS_ID | typeof NO_DATA_ACTIONS_ID | typeof RecoveredActionGroup.id;
export interface AlertExecutionDetails {
    alertId: string;
    executionId: string;
}
export type CustomThresholdAlert = Omit<ObservabilityMetricsAlert, 'kibana.alert.evaluation.values' | 'kibana.alert.evaluation.threshold' | 'kibana.alert.group'> & {
    [ALERT_EVALUATION_VALUES]?: Array<number | null>;
    [ALERT_EVALUATION_THRESHOLD]?: Array<number | null>;
    [ALERT_EVALUATION_TIME_RANGE]?: {
        gte: string;
        lte: string;
    };
    [ALERT_GROUP]?: Group[];
    [ALERT_GROUPING]?: Record<string, string>;
};
