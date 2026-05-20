import type { DataViewBase } from '@kbn/es-query';
import type { CustomThresholdExpressionMetric } from '../../../../../common/custom_threshold_rule/types';
export declare const createCustomMetricsAggregations: (id: string, customMetrics: CustomThresholdExpressionMetric[], currentTimeFrame: {
    start: number;
    end: number;
}, timeFieldName: string, equation?: string, dataView?: DataViewBase) => {};
