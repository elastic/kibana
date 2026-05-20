import React from 'react';
import type { SortState, NodeMetricsTableData } from '../shared';
import type { PodNodeMetricsRow } from './use_pod_metrics_table';
export interface PodMetricsTableProps {
    data: NodeMetricsTableData<PodNodeMetricsRow>;
    isLoading: boolean;
    setCurrentPageIndex: (value: number) => void;
    setSortState: (state: SortState<PodNodeMetricsRow>) => void;
    sortState: SortState<PodNodeMetricsRow>;
    timerange: {
        from: string;
        to: string;
    };
    isOtel?: boolean;
    metricIndices?: string;
}
export declare const PodMetricsTable: (props: PodMetricsTableProps) => React.JSX.Element | null;
