import type { AggregationType, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { CustomThresholdExpressionMetric } from '../../../../../common/custom_threshold_rule/types';
import type { MetricExpression } from '../../types';
export type CustomMetrics = MetricExpression['metrics'];
export interface AggregationTypes {
    [x: string]: AggregationType;
}
export interface NormalizedField {
    name: string;
    normalizedType: string;
    esTypes?: string[];
}
export type NormalizedFields = NormalizedField[];
export interface MetricRowBaseProps {
    name: string;
    onAdd: () => void;
    onDelete: (name: string) => void;
    disableDelete: boolean;
    disableAdd: boolean;
    onChange: (metric: CustomThresholdExpressionMetric) => void;
    aggregationTypes: AggregationTypes;
    errors: IErrorObject;
}
