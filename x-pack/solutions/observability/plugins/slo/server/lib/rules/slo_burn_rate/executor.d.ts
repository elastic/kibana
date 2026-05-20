import type { ExecutorType, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import type { ObservabilitySloAlert } from '@kbn/alerts-as-data-utils';
import type { IBasePath } from '@kbn/core/server';
import { ALERT_GROUP } from '@kbn/rule-data-utils';
import type { BurnRateAlertContext, BurnRateAlertState, BurnRateAllowedActionGroups, BurnRateRuleParams, BurnRateRuleTypeState, Group } from './types';
export type BurnRateAlert = Omit<ObservabilitySloAlert, 'kibana.alert.group'> & {
    [ALERT_GROUP]?: Group[];
};
export declare const getRuleExecutor: (basePath: IBasePath) => (options: RuleExecutorOptions<BurnRateRuleParams, BurnRateRuleTypeState, BurnRateAlertState, BurnRateAlertContext, BurnRateAllowedActionGroups, BurnRateAlert>) => ReturnType<ExecutorType<BurnRateRuleParams, BurnRateRuleTypeState, BurnRateAlertState, BurnRateAlertContext, BurnRateAllowedActionGroups>>;
