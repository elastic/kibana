import type { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
export declare const convertToApiThreshold: (previous: CustomThresholdExpressionMetric[], next: CustomThresholdExpressionMetric[], threshold: number[]) => number[];
export declare const isPercent: (metrics: CustomThresholdExpressionMetric[]) => boolean;
