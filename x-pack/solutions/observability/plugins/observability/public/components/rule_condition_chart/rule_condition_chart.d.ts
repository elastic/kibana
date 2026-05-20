import React from 'react';
import type { Query, Filter } from '@kbn/es-query';
import type { SeriesType, TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { TimeUnitChar } from '../../../common';
import type { LEGACY_COMPARATORS } from '../../../common/utils/convert_legacy_outside_comparator';
import type { Aggregators } from '../../../common/custom_threshold_rule/types';
interface ChartOptions {
    seriesType?: SeriesType;
    interval?: string;
}
interface GenericSearchSourceFields extends SerializedSearchSourceFields {
    query?: Query;
    filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}
export type GenericAggType = Aggregators | 'custom';
export interface GenericMetric {
    aggType: GenericAggType;
    name: string;
    field?: string;
    filter?: string;
}
export interface RuleConditionChartExpressions {
    metrics: GenericMetric[];
    threshold: number[];
    comparator: COMPARATORS | LEGACY_COMPARATORS;
    warningThreshold?: number[];
    warningComparator?: COMPARATORS | LEGACY_COMPARATORS;
    timeSize?: number;
    timeUnit?: TimeUnitChar;
    equation?: string;
    label?: string;
}
export interface RuleConditionChartProps {
    metricExpression: RuleConditionChartExpressions;
    searchConfiguration: GenericSearchSourceFields;
    dataView?: DataView;
    groupBy?: string | string[];
    error?: IErrorObject;
    timeRange: TimeRange;
    annotations?: EventAnnotationConfig[];
    chartOptions?: ChartOptions;
    additionalFilters?: Filter[];
}
export type TopValuesOrderParams = Pick<TermsIndexPatternColumn['params'], 'orderDirection' | 'orderBy' | 'orderAgg'> | undefined;
export declare function RuleConditionChart({ metricExpression, searchConfiguration, dataView, groupBy, error, annotations, timeRange, chartOptions: { seriesType, interval }, additionalFilters, }: RuleConditionChartProps): React.JSX.Element;
export default RuleConditionChart;
