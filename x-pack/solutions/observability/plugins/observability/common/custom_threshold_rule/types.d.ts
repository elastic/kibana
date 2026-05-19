import * as rt from 'io-ts';
import type { DataViewSpec, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { Filter, Query } from '@kbn/es-query';
import type { COMPARATORS } from '@kbn/alerting-comparators';
import type { LEGACY_COMPARATORS } from '../utils/convert_legacy_outside_comparator';
import type { TimeUnitChar } from '../utils/formatters/duration';
export declare const ThresholdFormatterTypeRT: rt.KeyofC<{
    abbreviatedNumber: null;
    bits: null;
    bytes: null;
    number: null;
    percent: null;
    highPrecision: null;
}>;
export type ThresholdFormatterType = rt.TypeOf<typeof ThresholdFormatterTypeRT>;
export declare enum Aggregators {
    COUNT = "count",
    AVERAGE = "avg",
    SUM = "sum",
    MIN = "min",
    MAX = "max",
    CARDINALITY = "cardinality",
    MED = "median",
    RATE = "rate",
    P95 = "p95",
    P99 = "p99",
    LAST_VALUE = "last_value"
}
export declare const aggType: rt.Type<Aggregators, Aggregators, unknown>;
export type AggType = rt.TypeOf<typeof aggType>;
export declare enum MetricsExplorerChartType {
    line = "line",
    area = "area",
    bar = "bar"
}
export declare enum AlertStates {
    OK = 0,
    ALERT = 1,
    WARNING = 2,
    NO_DATA = 3,
    ERROR = 4
}
export type NoDataBehavior = 'recover' | 'remainActive' | 'alertOnNoData';
export interface CustomThresholdSearchSourceFields extends SerializedSearchSourceFields {
    query?: Query;
    filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}
export interface ThresholdParams {
    criteria: MetricExpressionParams[];
    filterQuery?: string;
    sourceId?: string;
    alertOnNoData?: boolean;
    alertOnGroupDisappear?: boolean;
    noDataBehavior?: NoDataBehavior;
    searchConfiguration: CustomThresholdSearchSourceFields;
    groupBy?: string[];
}
export interface BaseMetricExpressionParams {
    timeSize: number;
    timeUnit: TimeUnitChar;
    sourceId?: string;
    threshold: number[];
    comparator: COMPARATORS | LEGACY_COMPARATORS;
}
export interface CustomThresholdExpressionMetric {
    name: string;
    aggType: AggType;
    field?: string;
    filter?: string;
}
export interface CustomMetricExpressionParams extends BaseMetricExpressionParams {
    metrics: CustomThresholdExpressionMetric[];
    equation?: string;
    label?: string;
}
export type MetricExpressionParams = CustomMetricExpressionParams;
export declare const QUERY_INVALID: unique symbol;
export type FilterQuery = string | typeof QUERY_INVALID;
export interface AlertExecutionDetails {
    alertId: string;
    executionId: string;
}
export declare enum InfraFormatterType {
    number = "number",
    abbreviatedNumber = "abbreviatedNumber",
    bytes = "bytes",
    bits = "bits",
    percent = "percent"
}
export interface SearchConfigurationType {
    index: SerializedSearchSourceFields;
    query: {
        query: string;
        language: string;
    };
    filter?: Filter[];
}
export interface SearchConfigurationWithExtractedReferenceType {
    index: DataViewSpec | string;
    query: {
        query: string;
        language: string;
    };
    filter?: Filter[];
}
export declare function fromEnum<EnumType extends string>(enumName: string, theEnum: Record<string, EnumType>): rt.Type<EnumType, EnumType, unknown>;
