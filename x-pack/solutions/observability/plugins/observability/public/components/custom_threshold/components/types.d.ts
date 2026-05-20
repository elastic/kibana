import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { TopAlert } from '../../..';
import type { CustomThresholdAlertFields, CustomThresholdRuleTypeParams } from '../types';
export type CustomThresholdRule = Rule<CustomThresholdRuleTypeParams>;
export type CustomThresholdAlert = TopAlert<CustomThresholdAlertFields>;
