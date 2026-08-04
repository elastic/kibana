import { type FormulasCatalog } from '../../../shared/metrics/types';
import type { HostFormulas } from '../formulas';
export declare const initCharts: (formulas: FormulasCatalog<HostFormulas>) => {
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
};
export type HostCharts = ReturnType<typeof initCharts>;
