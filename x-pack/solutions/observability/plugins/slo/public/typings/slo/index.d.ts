import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { Dependency } from '../../../common/burn_rate_rule/types';
type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M';
interface Duration {
    value: number;
    unit: DurationUnit;
}
interface WindowSchema {
    id: string;
    burnRateThreshold: number;
    maxBurnRateThreshold: number;
    longWindow: Duration;
    shortWindow: Duration;
    actionGroup: string;
}
interface BurnRateRuleParams extends RuleTypeParams {
    sloId: string;
    windows: WindowSchema[];
    dependencies?: Dependency[];
}
interface ChartData {
    key: number;
    value: number | undefined;
}
export type { BurnRateRuleParams, ChartData, Duration, DurationUnit, WindowSchema, Dependency };
