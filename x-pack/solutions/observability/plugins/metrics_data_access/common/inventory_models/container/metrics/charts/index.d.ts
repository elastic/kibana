export declare const charts: {
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
};
export type ContainerCharts = typeof charts;
