import type { estypes } from '@elastic/elasticsearch';
import type { InventoryItemType } from './types';
export { metrics } from './metrics';
declare const catalog: {
    readonly host: import("./types").InventoryModel<"host", {
        cpuV2: import("./shared/metrics/types").SchemaBasedAggregations;
        diskSpaceUsage: import("./shared/metrics/types").SchemaBasedAggregations;
        load: import("./shared/metrics/types").SchemaBasedAggregations;
        logRate: import("./types").MetricsUIAggregation;
        memory: import("./shared/metrics/types").SchemaBasedAggregations;
        memoryFree: import("./shared/metrics/types").SchemaBasedAggregations;
        normalizedLoad1m: import("./shared/metrics/types").SchemaBasedAggregations;
        rxV2: import("./shared/metrics/types").SchemaBasedAggregations;
        txV2: import("./shared/metrics/types").SchemaBasedAggregations;
        cpu: import("./types").MetricsUIAggregation;
        rx: import("./types").MetricsUIAggregation;
        tx: import("./types").MetricsUIAggregation;
    }, {
        cpuUsage: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageIowait: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageIrq: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageNice: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageSoftirq: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageSteal: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageUser: import("./shared/metrics/types").SchemaBasedFormula;
        cpuUsageSystem: import("./shared/metrics/types").SchemaBasedFormula;
        diskIORead: import("./shared/metrics/types").SchemaBasedFormula;
        diskIOWrite: import("./shared/metrics/types").SchemaBasedFormula;
        diskReadThroughput: import("./shared/metrics/types").SchemaBasedFormula;
        diskWriteThroughput: import("./shared/metrics/types").SchemaBasedFormula;
        diskSpaceAvailable: import("./shared/metrics/types").SchemaBasedFormula;
        diskUsage: import("./shared/metrics/types").SchemaBasedFormula;
        diskUsageAverage: import("./shared/metrics/types").SchemaBasedFormula;
        hostCount: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        logRate: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        normalizedLoad1m: import("./shared/metrics/types").SchemaBasedFormula;
        load1m: import("./shared/metrics/types").SchemaBasedFormula;
        load5m: import("./shared/metrics/types").SchemaBasedFormula;
        load15m: import("./shared/metrics/types").SchemaBasedFormula;
        memoryUsage: import("./shared/metrics/types").SchemaBasedFormula;
        memoryFree: import("./shared/metrics/types").SchemaBasedFormula;
        memoryUsed: import("./shared/metrics/types").SchemaBasedFormula;
        memoryFreeExcludingCache: import("./shared/metrics/types").SchemaBasedFormula;
        memoryCache: import("./shared/metrics/types").SchemaBasedFormula;
        rx: import("./shared/metrics/types").SchemaBasedFormula;
        tx: import("./shared/metrics/types").SchemaBasedFormula;
    }, {
        kubernetesNode?: {
            xy: {
                nodeCpuCapacity: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                nodeMemoryCapacity: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                nodeDiskCapacity: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                nodePodCapacity: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
        } | undefined;
        cpu: {
            xy: {
                cpuUsageBreakdown: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                loadBreakdown: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                cpuUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                normalizedLoad1m: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
            metric: {
                cpuUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
                normalizedLoad1m: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
            };
        };
        disk: {
            xy: {
                diskThroughputReadWrite: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskUsageByMountPoint: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskIOReadWrite: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskSpaceAvailable: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskIORead: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskIOWrite: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskReadThroughput: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                diskWriteThroughput: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
            metric: {
                diskUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
            };
        };
        memory: {
            xy: {
                memoryUsageBreakdown: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                memoryUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                memoryFree: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
            metric: {
                memoryUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
            };
        };
        network: {
            readonly xy: {
                readonly rxTx: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                readonly rx: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                readonly tx: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
        };
        logs: {
            xy: {
                logRate: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
        };
    }>;
    readonly pod: import("./types").InventoryModel<"pod", {
        memory: import("./types").MetricsUIAggregation;
        cpu: import("./types").MetricsUIAggregation;
        rx: import("./types").MetricsUIAggregation;
        tx: import("./types").MetricsUIAggregation;
    }, undefined, undefined>;
    readonly container: import("./types").InventoryModel<"container", {
        memory: import("./types").MetricsUIAggregation;
        cpu: import("./types").MetricsUIAggregation;
        rx: import("./types").MetricsUIAggregation;
        tx: import("./types").MetricsUIAggregation;
    }, {
        dockerContainerCpuUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        dockerContainerMemoryUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        dockerContainerNetworkRx: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        dockerContainerNetworkTx: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        dockerContainerDiskIORead: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        dockerContainerDiskIOWrite: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        k8sContainerCpuUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
        k8sContainerMemoryUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    }, {
        readonly cpu: {
            readonly xy: {
                readonly dockerContainerCpuUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                readonly k8sContainerCpuUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
            readonly metric: {
                readonly dockerContainerCpuUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
                readonly k8sContainerCpuUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
            };
        };
        readonly memory: {
            xy: {
                dockerContainerMemoryUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
                k8sContainerMemoryUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
            metric: {
                dockerContainerMemoryUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
                k8sContainerMemoryUsage: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    label?: string | undefined;
                    filter?: string | undefined;
                    format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                    decimals?: number | undefined;
                    normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                    suffix?: string | undefined;
                    fromUnit?: string | undefined;
                    toUnit?: string | undefined;
                    compactValues?: boolean | undefined;
                    randomSampling?: number | undefined;
                    useGlobalFilter?: boolean | undefined;
                    seriesColor?: string | undefined;
                    value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                    chartType: "metric";
                    querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                    breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                    trendLine?: boolean | undefined;
                    subtitle?: string | undefined;
                } & {
                    id: string;
                };
            };
        };
        readonly network: {
            xy: {
                dockerContainerRxTx: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
        };
        readonly diskIO: {
            xy: {
                dockerContainerDiskIOReadWrite: {
                    title: string;
                    description?: string | undefined;
                    dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                    chartType: "xy";
                    layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                    legend?: {
                        show?: boolean | undefined;
                        position?: "top" | "left" | "bottom" | "right" | undefined;
                        legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                    } | undefined;
                    axisTitleVisibility?: {
                        showXAxisTitle?: boolean | undefined;
                        showYAxisTitle?: boolean | undefined;
                        showYRightAxisTitle?: boolean | undefined;
                    } | undefined;
                    emphasizeFitting?: boolean | undefined;
                    fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                    yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                    valueLabels?: "hide" | "show" | undefined;
                } & {
                    id: string;
                };
            };
        };
    }>;
    readonly awsEC2: import("./types").InventoryModel<"awsEC2", {
        cpu: import("./types").MetricsUIAggregation;
        rx: import("./types").MetricsUIAggregation;
        tx: import("./types").MetricsUIAggregation;
        diskIOReadBytes: import("./types").MetricsUIAggregation;
        diskIOWriteBytes: import("./types").MetricsUIAggregation;
    }, undefined, undefined>;
    readonly awsS3: import("./types").InventoryModel<"awsS3", {
        s3BucketSize: import("./types").MetricsUIAggregation;
        s3NumberOfObjects: import("./types").MetricsUIAggregation;
        s3TotalRequests: import("./types").MetricsUIAggregation;
        s3UploadBytes: import("./types").MetricsUIAggregation;
        s3DownloadBytes: import("./types").MetricsUIAggregation;
    }, undefined, undefined>;
    readonly awsRDS: import("./types").InventoryModel<"awsRDS", {
        cpu: import("./types").MetricsUIAggregation;
        rdsLatency: import("./types").MetricsUIAggregation;
        rdsConnections: import("./types").MetricsUIAggregation;
        rdsQueriesExecuted: import("./types").MetricsUIAggregation;
        rdsActiveTransactions: import("./types").MetricsUIAggregation;
    }, undefined, undefined>;
    readonly awsSQS: import("./types").InventoryModel<"awsSQS", {
        sqsMessagesVisible: import("./types").MetricsUIAggregation;
        sqsMessagesDelayed: import("./types").MetricsUIAggregation;
        sqsMessagesEmpty: import("./types").MetricsUIAggregation;
        sqsMessagesSent: import("./types").MetricsUIAggregation;
        sqsOldestMessage: import("./types").MetricsUIAggregation;
    }, undefined, undefined>;
};
export declare const inventoryModels: (import("./types").InventoryModel<"host", {
    cpuV2: import("./shared/metrics/types").SchemaBasedAggregations;
    diskSpaceUsage: import("./shared/metrics/types").SchemaBasedAggregations;
    load: import("./shared/metrics/types").SchemaBasedAggregations;
    logRate: import("./types").MetricsUIAggregation;
    memory: import("./shared/metrics/types").SchemaBasedAggregations;
    memoryFree: import("./shared/metrics/types").SchemaBasedAggregations;
    normalizedLoad1m: import("./shared/metrics/types").SchemaBasedAggregations;
    rxV2: import("./shared/metrics/types").SchemaBasedAggregations;
    txV2: import("./shared/metrics/types").SchemaBasedAggregations;
    cpu: import("./types").MetricsUIAggregation;
    rx: import("./types").MetricsUIAggregation;
    tx: import("./types").MetricsUIAggregation;
}, {
    cpuUsage: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageIowait: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageIrq: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageNice: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageSoftirq: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageSteal: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageUser: import("./shared/metrics/types").SchemaBasedFormula;
    cpuUsageSystem: import("./shared/metrics/types").SchemaBasedFormula;
    diskIORead: import("./shared/metrics/types").SchemaBasedFormula;
    diskIOWrite: import("./shared/metrics/types").SchemaBasedFormula;
    diskReadThroughput: import("./shared/metrics/types").SchemaBasedFormula;
    diskWriteThroughput: import("./shared/metrics/types").SchemaBasedFormula;
    diskSpaceAvailable: import("./shared/metrics/types").SchemaBasedFormula;
    diskUsage: import("./shared/metrics/types").SchemaBasedFormula;
    diskUsageAverage: import("./shared/metrics/types").SchemaBasedFormula;
    hostCount: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    logRate: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    normalizedLoad1m: import("./shared/metrics/types").SchemaBasedFormula;
    load1m: import("./shared/metrics/types").SchemaBasedFormula;
    load5m: import("./shared/metrics/types").SchemaBasedFormula;
    load15m: import("./shared/metrics/types").SchemaBasedFormula;
    memoryUsage: import("./shared/metrics/types").SchemaBasedFormula;
    memoryFree: import("./shared/metrics/types").SchemaBasedFormula;
    memoryUsed: import("./shared/metrics/types").SchemaBasedFormula;
    memoryFreeExcludingCache: import("./shared/metrics/types").SchemaBasedFormula;
    memoryCache: import("./shared/metrics/types").SchemaBasedFormula;
    rx: import("./shared/metrics/types").SchemaBasedFormula;
    tx: import("./shared/metrics/types").SchemaBasedFormula;
}, {
    kubernetesNode?: {
        xy: {
            nodeCpuCapacity: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            nodeMemoryCapacity: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            nodeDiskCapacity: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            nodePodCapacity: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
    } | undefined;
    cpu: {
        xy: {
            cpuUsageBreakdown: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            loadBreakdown: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            cpuUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            normalizedLoad1m: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
        metric: {
            cpuUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
            normalizedLoad1m: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
        };
    };
    disk: {
        xy: {
            diskThroughputReadWrite: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskUsageByMountPoint: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskIOReadWrite: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskSpaceAvailable: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskIORead: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskIOWrite: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskReadThroughput: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            diskWriteThroughput: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
        metric: {
            diskUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
        };
    };
    memory: {
        xy: {
            memoryUsageBreakdown: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            memoryUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            memoryFree: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
        metric: {
            memoryUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
        };
    };
    network: {
        readonly xy: {
            readonly rxTx: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            readonly rx: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            readonly tx: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
    };
    logs: {
        xy: {
            logRate: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
    };
}> | import("./types").InventoryModel<"pod", {
    memory: import("./types").MetricsUIAggregation;
    cpu: import("./types").MetricsUIAggregation;
    rx: import("./types").MetricsUIAggregation;
    tx: import("./types").MetricsUIAggregation;
}, undefined, undefined> | import("./types").InventoryModel<"awsEC2", {
    cpu: import("./types").MetricsUIAggregation;
    rx: import("./types").MetricsUIAggregation;
    tx: import("./types").MetricsUIAggregation;
    diskIOReadBytes: import("./types").MetricsUIAggregation;
    diskIOWriteBytes: import("./types").MetricsUIAggregation;
}, undefined, undefined> | import("./types").InventoryModel<"awsS3", {
    s3BucketSize: import("./types").MetricsUIAggregation;
    s3NumberOfObjects: import("./types").MetricsUIAggregation;
    s3TotalRequests: import("./types").MetricsUIAggregation;
    s3UploadBytes: import("./types").MetricsUIAggregation;
    s3DownloadBytes: import("./types").MetricsUIAggregation;
}, undefined, undefined> | import("./types").InventoryModel<"awsRDS", {
    cpu: import("./types").MetricsUIAggregation;
    rdsLatency: import("./types").MetricsUIAggregation;
    rdsConnections: import("./types").MetricsUIAggregation;
    rdsQueriesExecuted: import("./types").MetricsUIAggregation;
    rdsActiveTransactions: import("./types").MetricsUIAggregation;
}, undefined, undefined> | import("./types").InventoryModel<"awsSQS", {
    sqsMessagesVisible: import("./types").MetricsUIAggregation;
    sqsMessagesDelayed: import("./types").MetricsUIAggregation;
    sqsMessagesEmpty: import("./types").MetricsUIAggregation;
    sqsMessagesSent: import("./types").MetricsUIAggregation;
    sqsOldestMessage: import("./types").MetricsUIAggregation;
}, undefined, undefined> | import("./types").InventoryModel<"container", {
    memory: import("./types").MetricsUIAggregation;
    cpu: import("./types").MetricsUIAggregation;
    rx: import("./types").MetricsUIAggregation;
    tx: import("./types").MetricsUIAggregation;
}, {
    dockerContainerCpuUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerMemoryUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerNetworkRx: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerNetworkTx: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerDiskIORead: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    dockerContainerDiskIOWrite: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    k8sContainerCpuUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    k8sContainerMemoryUsage: import("@kbn/lens-embeddable-utils").LensBaseLayer;
}, {
    readonly cpu: {
        readonly xy: {
            readonly dockerContainerCpuUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            readonly k8sContainerCpuUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
        readonly metric: {
            readonly dockerContainerCpuUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
            readonly k8sContainerCpuUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
        };
    };
    readonly memory: {
        xy: {
            dockerContainerMemoryUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
            k8sContainerMemoryUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
        metric: {
            dockerContainerMemoryUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
            k8sContainerMemoryUsage: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                label?: string | undefined;
                filter?: string | undefined;
                format?: "bits" | "bytes" | "currency" | "duration" | "number" | "percent" | "string" | undefined;
                decimals?: number | undefined;
                normalizeByUnit?: "s" | "m" | "h" | "d" | undefined;
                suffix?: string | undefined;
                fromUnit?: string | undefined;
                toUnit?: string | undefined;
                compactValues?: boolean | undefined;
                randomSampling?: number | undefined;
                useGlobalFilter?: boolean | undefined;
                seriesColor?: string | undefined;
                value: import("@kbn/lens-embeddable-utils").LensLayerQuery;
                chartType: "metric";
                querySecondaryMetric?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                queryMaxValue?: import("@kbn/lens-embeddable-utils").LensLayerQuery | undefined;
                breakdown?: import("@kbn/lens-embeddable-utils").LensBreakdownConfig | undefined;
                trendLine?: boolean | undefined;
                subtitle?: string | undefined;
            } & {
                id: string;
            };
        };
    };
    readonly network: {
        xy: {
            dockerContainerRxTx: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
    };
    readonly diskIO: {
        xy: {
            dockerContainerDiskIOReadWrite: {
                title: string;
                description?: string | undefined;
                dataset?: import("@kbn/lens-embeddable-utils").LensDataset | undefined;
                chartType: "xy";
                layers: Array<import("@kbn/lens-embeddable-utils").LensSeriesLayer | import("@kbn/lens-embeddable-utils").LensAnnotationLayer | import("@kbn/lens-embeddable-utils").LensReferenceLineLayer>;
                legend?: {
                    show?: boolean | undefined;
                    position?: "top" | "left" | "bottom" | "right" | undefined;
                    legendStats?: import("@kbn/chart-expressions-common").XYLegendValue[] | undefined;
                } | undefined;
                axisTitleVisibility?: {
                    showXAxisTitle?: boolean | undefined;
                    showYAxisTitle?: boolean | undefined;
                    showYRightAxisTitle?: boolean | undefined;
                } | undefined;
                emphasizeFitting?: boolean | undefined;
                fittingFunction?: "None" | "Zero" | "Linear" | "Carry" | "Lookahead" | "Average" | "Nearest" | undefined;
                yBounds?: import("@kbn/lens-embeddable-utils").LensYBoundsConfig | undefined;
                valueLabels?: "hide" | "show" | undefined;
            } & {
                id: string;
            };
        };
    };
}>)[];
export type InventoryModels = typeof catalog;
export declare const findInventoryModel: <TType extends keyof InventoryModels>(type: TType) => InventoryModels[TType];
export declare const getFieldByType: (type: InventoryItemType) => "host.name" | "container.id" | "kubernetes.pod.uid" | undefined;
export declare const findInventoryFields: (type: InventoryItemType) => {
    id: string;
    name: string;
    os?: string;
    ip?: string;
    cloudProvider?: string;
};
export declare const isBasicMetricAgg: (agg: unknown) => agg is Record<string, undefined | Pick<estypes.AggregationsMetricAggregationBase, "field">>;
export declare const isDerivativeAgg: (agg: unknown) => agg is Pick<estypes.AggregationsAggregationContainer, "derivative">;
export declare const isSumBucketAgg: (agg: unknown) => agg is Pick<estypes.AggregationsAggregationContainer, "sum_bucket">;
export declare const isTermsWithAggregation: (agg: unknown) => agg is Pick<estypes.AggregationsAggregationContainer, "terms" | "aggregations">;
export declare const isFilterWithAggregations: (agg: unknown) => agg is Pick<estypes.AggregationsAggregationContainer, "filter" | "aggs">;
