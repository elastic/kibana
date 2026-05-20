import type { Rule } from '@kbn/alerting-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { BurnRateRuleParams } from '../../typings/slo';
export type { TimeRange } from '../slo/error_rate_chart/use_lens_definition';
export type BurnRateRule = Rule<BurnRateRuleParams>;
export type BurnRateAlert = TopAlert;
