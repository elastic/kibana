import React from 'react';
import type { SortState, NodeMetricsTableData } from '../shared';
import type { ContainerNodeMetricsRow } from './use_container_metrics_table';
export interface ContainerMetricsTableProps {
    data: NodeMetricsTableData<ContainerNodeMetricsRow>;
    isLoading: boolean;
    setCurrentPageIndex: (value: number) => void;
    setSortState: (state: SortState<ContainerNodeMetricsRow>) => void;
    sortState: SortState<ContainerNodeMetricsRow>;
    timerange: {
        from: string;
        to: string;
    };
    isOtel?: boolean;
    metricsIndices?: string;
    isK8sContainer?: boolean;
}
export declare const ContainerMetricsTable: (props: ContainerMetricsTableProps) => React.JSX.Element | null;
