export declare const network: {
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
