export declare const host: import("../types").InventoryModel<"host", {
    cpuV2: import("../shared/metrics/types").SchemaBasedAggregations;
    diskSpaceUsage: import("../shared/metrics/types").SchemaBasedAggregations;
    load: import("../shared/metrics/types").SchemaBasedAggregations;
    logRate: import("../types").MetricsUIAggregation;
    memory: import("../shared/metrics/types").SchemaBasedAggregations;
    memoryFree: import("../shared/metrics/types").SchemaBasedAggregations;
    normalizedLoad1m: import("../shared/metrics/types").SchemaBasedAggregations;
    rxV2: import("../shared/metrics/types").SchemaBasedAggregations;
    txV2: import("../shared/metrics/types").SchemaBasedAggregations;
    cpu: import("../types").MetricsUIAggregation;
    rx: import("../types").MetricsUIAggregation;
    tx: import("../types").MetricsUIAggregation;
}, {
    cpuUsage: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageIowait: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageIrq: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageNice: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageSoftirq: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageSteal: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageUser: import("../shared/metrics/types").SchemaBasedFormula;
    cpuUsageSystem: import("../shared/metrics/types").SchemaBasedFormula;
    diskIORead: import("../shared/metrics/types").SchemaBasedFormula;
    diskIOWrite: import("../shared/metrics/types").SchemaBasedFormula;
    diskReadThroughput: import("../shared/metrics/types").SchemaBasedFormula;
    diskWriteThroughput: import("../shared/metrics/types").SchemaBasedFormula;
    diskSpaceAvailable: import("../shared/metrics/types").SchemaBasedFormula;
    diskUsage: import("../shared/metrics/types").SchemaBasedFormula;
    diskUsageAverage: import("../shared/metrics/types").SchemaBasedFormula;
    hostCount: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    logRate: import("@kbn/lens-embeddable-utils").LensBaseLayer;
    normalizedLoad1m: import("../shared/metrics/types").SchemaBasedFormula;
    load1m: import("../shared/metrics/types").SchemaBasedFormula;
    load5m: import("../shared/metrics/types").SchemaBasedFormula;
    load15m: import("../shared/metrics/types").SchemaBasedFormula;
    memoryUsage: import("../shared/metrics/types").SchemaBasedFormula;
    memoryFree: import("../shared/metrics/types").SchemaBasedFormula;
    memoryUsed: import("../shared/metrics/types").SchemaBasedFormula;
    memoryFreeExcludingCache: import("../shared/metrics/types").SchemaBasedFormula;
    memoryCache: import("../shared/metrics/types").SchemaBasedFormula;
    rx: import("../shared/metrics/types").SchemaBasedFormula;
    tx: import("../shared/metrics/types").SchemaBasedFormula;
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
