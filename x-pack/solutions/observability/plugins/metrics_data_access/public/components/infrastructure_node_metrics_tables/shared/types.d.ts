import type { CoreProvidersProps } from '../../../apps/common_providers';
import type { MetricsDataClient } from '../../../lib/metrics_client';
export interface UseNodeMetricsTableOptions {
    timerange: {
        from: string;
        to: string;
    };
    kuery?: string;
    metricsClient: MetricsDataClient;
    isOtel?: boolean;
}
export interface SourceProviderProps {
    sourceId: string;
}
export type IntegratedNodeMetricsTableProps = UseNodeMetricsTableOptions & SourceProviderProps & CoreProvidersProps;
export type NodeMetricsTableProps = Omit<UseNodeMetricsTableOptions, 'metricsClient'> & Partial<SourceProviderProps>;
export type NodeMetricsTableData<NodeMetricsRow> = {
    state: 'unknown';
} | {
    state: 'no-indices';
} | {
    state: 'empty-indices';
} | {
    state: 'data';
    currentPageIndex: number;
    pageCount: number;
    rows: NodeMetricsRow[];
} | {
    state: 'error';
    errors: Error[];
};
