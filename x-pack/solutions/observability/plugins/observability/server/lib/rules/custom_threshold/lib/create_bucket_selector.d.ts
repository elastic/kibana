import type { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';
export declare const createBucketSelector: (condition: CustomMetricExpressionParams, alertOnGroupDisappear: boolean | undefined, timeFieldName: string, groupBy?: string | string[], lastPeriodEnd?: number) => any;
