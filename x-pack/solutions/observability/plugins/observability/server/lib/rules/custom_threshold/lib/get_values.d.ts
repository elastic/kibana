import type { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';
import type { Evaluation } from './evaluate_rule';
export declare const getEvaluationValues: (alertResults: Array<Record<string, Evaluation>>, group: string) => Array<number | null>;
export declare const getThreshold: (criteria: CustomMetricExpressionParams[]) => number[] | undefined;
