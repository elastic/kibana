import React from 'react';
import type { SortState, NodeMetricsTableData } from '../shared';
import type { HostNodeMetricsRow } from './use_host_metrics_table';
export interface HostMetricsTableProps {
    data: NodeMetricsTableData<HostNodeMetricsRow>;
    isLoading: boolean;
    setCurrentPageIndex: (value: number) => void;
    setSortState: (state: SortState<HostNodeMetricsRow>) => void;
    sortState: SortState<HostNodeMetricsRow>;
    timerange: {
        from: string;
        to: string;
    };
    isOtel?: boolean;
    metricIndices?: string;
}
export declare const HostMetricsTable: (props: HostMetricsTableProps) => React.JSX.Element | null;
