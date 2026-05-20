import type { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import type { BurnRateRuleParams } from '../../typings';
export interface WindowResult {
    longWindow: string[];
    shortWindow: string[];
    burnRateThreshold: string[];
}
export type ValidationBurnRateRuleResult = ValidationResult & {
    errors: {
        sloId: string[];
        windows: WindowResult[];
    };
};
type Optional<T> = {
    [P in keyof T]?: T[P];
};
export declare function validateBurnRateRule(ruleParams: Optional<BurnRateRuleParams>): ValidationBurnRateRuleResult;
export {};
