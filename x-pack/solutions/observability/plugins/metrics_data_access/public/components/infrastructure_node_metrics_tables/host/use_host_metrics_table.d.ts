import type { SortState, UseNodeMetricsTableOptions } from '../shared';
import type { SYSTEM_CPU_CORES, SYSTEM_CPU_TOTAL_NORM_PCT, SYSTEM_MEMORY_TOTAL, SYSTEM_MEMORY_USED_PCT } from '../shared/constants';
type HostMetricsField = typeof SYSTEM_CPU_CORES | typeof SYSTEM_CPU_TOTAL_NORM_PCT | typeof SYSTEM_MEMORY_TOTAL | typeof SYSTEM_MEMORY_USED_PCT;
export declare const metricByField: Record<HostMetricsField, string>;
export interface HostNodeMetricsRow {
    name: string;
    cpuCount: number | null;
    averageCpuUsagePercent: number | null;
    totalMemoryMegabytes: number | null;
    averageMemoryUsagePercent: number | null;
}
export declare function useHostMetricsTable({ timerange, kuery, metricsClient, isOtel, }: UseNodeMetricsTableOptions): {
    data: import("../shared").NodeMetricsTableData<HostNodeMetricsRow>;
    isLoading: boolean;
    metricIndices: string | undefined;
    setCurrentPageIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
    setSortState: import("react").Dispatch<import("react").SetStateAction<SortState<HostNodeMetricsRow>>>;
    sortState: SortState<HostNodeMetricsRow>;
    timerange: {
        from: string;
        to: string;
    };
};
export {};
