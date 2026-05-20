declare enum InfraFormatterType {
    number = "number",
    abbreviatedNumber = "abbreviatedNumber",
    bytes = "bytes",
    bits = "bits",
    percent = "percent"
}
interface MetricFormatter {
    formatter: InfraFormatterType;
    template: string;
    bounds?: {
        min: number;
        max: number;
    };
}
interface MetricFormatters {
    [key: string]: MetricFormatter;
}
export declare const METRIC_FORMATTERS: MetricFormatters;
export {};
