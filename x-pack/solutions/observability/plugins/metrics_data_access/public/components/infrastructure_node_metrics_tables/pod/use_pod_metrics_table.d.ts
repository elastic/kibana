import type { SortState, UseNodeMetricsTableOptions } from '../shared';
import type { ECS_POD_CPU_USAGE_LIMIT_PCT, MEMORY_LIMIT_UTILIZATION } from '../shared/constants';
type PodMetricsField = typeof ECS_POD_CPU_USAGE_LIMIT_PCT | typeof MEMORY_LIMIT_UTILIZATION;
export declare const metricByField: Record<PodMetricsField, string>;
export interface PodNodeMetricsRow {
    id: string;
    name: string;
    averageCpuUsagePercent: number | null;
    averageMemoryUsagePercent: number | null;
    memoryUnit: '%' | ' MB';
}
export declare function usePodMetricsTable({ timerange, kuery, metricsClient, isOtel, }: UseNodeMetricsTableOptions): {
    currentPageIndex: number;
    data: import("../shared").NodeMetricsTableData<PodNodeMetricsRow>;
    isLoading: boolean;
    metricIndices: string | undefined;
    setCurrentPageIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
    setSortState: import("react").Dispatch<import("react").SetStateAction<SortState<PodNodeMetricsRow>>>;
    sortState: SortState<PodNodeMetricsRow>;
    timerange: {
        from: string;
        to: string;
    };
};
export {};
