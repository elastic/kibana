import type { SortState, UseNodeMetricsTableOptions } from '../shared';
export { metricByFieldEcs, metricByField } from './container_metrics_configs';
export interface UseContainerMetricsTableOptions extends UseNodeMetricsTableOptions {
    isK8sContainer?: boolean;
}
export interface ContainerNodeMetricsRow {
    id: string;
    averageCpuUsage: number | null;
    averageMemoryUsage: number | null;
}
export declare function useContainerMetricsTable({ timerange, kuery, metricsClient, isOtel, isK8sContainer, }: UseContainerMetricsTableOptions): {
    data: import("../shared").NodeMetricsTableData<ContainerNodeMetricsRow>;
    isLoading: boolean;
    metricIndices: string | undefined;
    setCurrentPageIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
    setSortState: import("react").Dispatch<import("react").SetStateAction<SortState<ContainerNodeMetricsRow>>>;
    sortState: SortState<ContainerNodeMetricsRow>;
    timerange: {
        from: string;
        to: string;
    };
};
