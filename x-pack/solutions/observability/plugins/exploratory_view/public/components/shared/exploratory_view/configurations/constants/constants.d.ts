import type { ReportViewType } from '../../types';
export declare const DEFAULT_TIME: {
    from: string;
    to: string;
};
export declare const RECORDS_FIELD = "___records___";
export declare const RECORDS_PERCENTAGE_FIELD = "RecordsPercentage";
export declare const FORMULA_COLUMN = "FORMULA_COLUMN";
export declare const FieldLabels: Record<string, string>;
export declare const DataViewLabels: Record<ReportViewType, string>;
export declare enum ReportTypes {
    KPI = "kpi-over-time",
    DISTRIBUTION = "data-distribution",
    CORE_WEB_VITAL = "core-web-vitals",
    DEVICE_DISTRIBUTION = "device-data-distribution",
    SINGLE_METRIC = "single-metric",
    HEATMAP = "heatmap"
}
export declare const USE_BREAK_DOWN_COLUMN = "USE_BREAK_DOWN_COLUMN";
export declare const FILTER_RECORDS = "FILTER_RECORDS";
export declare const TERMS_COLUMN = "TERMS_COLUMN";
export declare const OPERATION_COLUMN = "operation";
export declare const PERCENTILE = "percentile";
export declare const REPORT_METRIC_FIELD = "REPORT_METRIC_FIELD";
export declare const REPORT_METRIC_TIMESTAMP = "REPORT_METRIC_FIELD_TIMESTAMP";
export declare const PERCENTILE_RANKS: string[];
export declare const LABEL_FIELDS_FILTER = "LABEL_FIELDS_FILTER";
export declare const LABEL_FIELDS_BREAKDOWN = "LABEL_FIELDS_BREAKDOWN";
export declare const ENVIRONMENT_ALL = "ENVIRONMENT_ALL";
