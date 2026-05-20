import React from 'react';
import type { RuleTypeParams, RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import { type NoDataBehavior } from '../../../common/custom_threshold_rule/types';
import type { AlertContextMeta, AlertParams, MetricExpression } from './types';
export type CustomThresholdRuleExpressionProps = Omit<RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>, 'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch'> & {
    kql: KqlPluginStart;
};
export declare const defaultExpression: MetricExpression;
export declare const getNoDataBehaviorValue: (ruleParams: AlertParams, hasGroupBy: boolean) => NoDataBehavior;
export default function Expressions(props: CustomThresholdRuleExpressionProps): React.JSX.Element;
