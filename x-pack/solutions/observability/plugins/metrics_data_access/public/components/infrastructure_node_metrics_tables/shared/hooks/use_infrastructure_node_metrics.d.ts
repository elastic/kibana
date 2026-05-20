import type { MetricsExplorerSeries } from '../../../../../common/http_api/metrics_explorer';
import type { MetricsExplorerOptions, MetricsExplorerTimeOptions } from '../../../../../common/metrics_explorer_views/types';
import type { NodeMetricsTableData } from '../types';
import type { MetricsDataClient } from '../../../../lib/metrics_client';
export interface SortState<T> {
    field: keyof T;
    direction: 'asc' | 'desc';
}
export declare const useMetricIndices: ({ metricsClient }: {
    metricsClient: MetricsDataClient;
}) => {
    isLoading: boolean;
    isUninitialized: boolean;
    errorMessage: string | undefined;
    metricIndicesExist: boolean | undefined;
    metricIndices: string | undefined;
};
interface UseInfrastructureNodeMetricsOptions<T> {
    metricsExplorerOptions: MetricsExplorerOptions;
    timerange: Pick<MetricsExplorerTimeOptions, 'from' | 'to'>;
    transform: (series: MetricsExplorerSeries) => T;
    sortState: SortState<T>;
    currentPageIndex: number;
    metricsClient: MetricsDataClient;
}
export declare const useInfrastructureNodeMetrics: <T>(options: UseInfrastructureNodeMetricsOptions<T>) => {
    isLoading: boolean;
    data: NodeMetricsTableData<T>;
    metricIndices: string | undefined;
};
export {};
