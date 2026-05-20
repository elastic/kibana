import type { APMTransactionDurationIndicator, APMTransactionErrorRateIndicator, SyntheticsAvailabilityIndicator, BudgetingMethod, HistogramIndicator, IndicatorType, KQLCustomIndicator, MetricCustomIndicator, TimesliceMetricIndicator, TimeWindowType } from '@kbn/slo-schema';
import type { CreateSLOForm } from './types';
export declare const MAX_WIDTH = 900;
export declare const SLI_OPTIONS: Array<{
    value: IndicatorType;
    text: string;
}>;
export declare const BUDGETING_METHOD_OPTIONS: Array<{
    value: BudgetingMethod;
    text: string;
}>;
export declare const TIMEWINDOW_TYPE_OPTIONS: Array<{
    value: TimeWindowType;
    text: string;
}>;
export declare const CALENDARALIGNED_TIMEWINDOW_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const ROLLING_TIMEWINDOW_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const CUSTOM_KQL_DEFAULT_VALUES: KQLCustomIndicator;
export declare const CUSTOM_METRIC_DEFAULT_VALUES: MetricCustomIndicator;
export declare const TIMESLICE_METRIC_DEFAULT_VALUES: TimesliceMetricIndicator;
export declare const HISTOGRAM_DEFAULT_VALUES: HistogramIndicator;
export declare const APM_LATENCY_DEFAULT_VALUES: APMTransactionDurationIndicator;
export declare const APM_AVAILABILITY_DEFAULT_VALUES: APMTransactionErrorRateIndicator;
export declare const SYNTHETICS_AVAILABILITY_DEFAULT_VALUES: SyntheticsAvailabilityIndicator;
export declare const SETTINGS_DEFAULT_VALUES: {
    frequency: number;
    preventInitialBackfill: boolean;
    syncDelay: number;
    syncField: null;
};
export declare const SLO_EDIT_FORM_DEFAULT_VALUES: CreateSLOForm;
export declare const SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC: CreateSLOForm;
export declare const SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY: CreateSLOForm;
export declare const COMPARATOR_GT: string;
export declare const COMPARATOR_GTE: string;
export declare const COMPARATOR_LT: string;
export declare const COMPARATOR_LTE: string;
export declare const COMPARATOR_MAPPING: {
    GT: string;
    GTE: string;
    LT: string;
    LTE: string;
};
export declare const COMPARATOR_OPTIONS: ({
    text: string;
    value: "GT";
} | {
    text: string;
    value: "GTE";
} | {
    text: string;
    value: "LT";
} | {
    text: string;
    value: "LTE";
})[];
