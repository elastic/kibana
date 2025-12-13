/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridSorting,
} from '@elastic/eui';
import {
  EuiDataGrid,
  EuiBadge,
  EuiProgress,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { useEsqlQuery } from '../../../../hooks/use_esql_query';

interface WorkloadResourcesTableProps {
  clusterName: string;
  timeRange: TimeRange;
}

interface NodeData {
  'k8s.node.name': string;
  status: string;
  kubelet_version: string | null;
  cpu_utilization: number | null;
  memory_utilization: number | null;
  pod_utilization: number | null;
}

const COLUMNS: EuiDataGridColumn[] = [
  {
    id: 'status',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.statusColumn', {
      defaultMessage: 'Status',
    }),
    initialWidth: 110,
    isSortable: true,
  },
  {
    id: 'k8s.node.name',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.nodeColumn', {
      defaultMessage: 'Node',
    }),
    isSortable: true,
  },
  {
    id: 'kubelet_version',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.kubeletVersionColumn', {
      defaultMessage: 'Kubelet version',
    }),
    initialWidth: 130,
    isSortable: true,
  },
  {
    id: 'cpu_utilization',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.cpuUtilColumn', {
      defaultMessage: 'CPU util',
    }),
    initialWidth: 150,
    isSortable: true,
  },
  {
    id: 'memory_utilization',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.memoryUtilColumn', {
      defaultMessage: 'Memory util',
    }),
    initialWidth: 150,
    isSortable: true,
  },
  {
    id: 'pod_utilization',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.podUtilColumn', {
      defaultMessage: 'Pod util',
    }),
    initialWidth: 150,
    isSortable: true,
  },
];

type NodeStatus = 'Ready' | 'NotReady' | 'Unknown';

const StatusBadge: React.FC<{ status: NodeStatus }> = ({ status }) => {
  const getColor = (s: NodeStatus): 'success' | 'danger' | 'hollow' => {
    switch (s) {
      case 'Ready':
        return 'success';
      case 'NotReady':
        return 'danger';
      case 'Unknown':
      default:
        return 'hollow';
    }
  };

  return <EuiBadge color={getColor(status)}>{status}</EuiBadge>;
};

interface UtilizationCellProps {
  value: number | null;
}

const UtilizationCell: React.FC<UtilizationCellProps> = ({ value }) => {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <EuiText size="s" color="subdued">
        —
      </EuiText>
    );
  }

  const getColor = (percentage: number): 'success' | 'warning' | 'danger' => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'danger';
  };

  const percentValue = value * 100;
  const color = getColor(percentValue);
  const displayValue = Math.min(100, Math.max(0, percentValue));

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} style={{ minWidth: 50 }}>
        <EuiText size="s">{percentValue.toFixed(2)}%</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiProgress value={displayValue} max={100} size="m" color={color} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const buildQuery = (clusterName: string): string => {
  return `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.node.name IS NOT NULL
  AND (
    k8s.node.condition_ready IS NOT NULL
    OR k8s.kubelet.version IS NOT NULL
    OR k8s.node.cpu.usage IS NOT NULL
    OR k8s.node.memory.usage IS NOT NULL
    OR k8s.node.allocatable_cpu IS NOT NULL
    OR k8s.node.allocatable_memory IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
  )
| STATS
    condition_ready = MAX(k8s.node.condition_ready),
    kubelet_version = MAX(k8s.kubelet.version),
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu),
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory),
    pod_count = COUNT_DISTINCT(k8s.pod.uid)
  BY k8s.node.name
| EVAL status = CASE(
    condition_ready > 0, "Ready",
    condition_ready == 0, "NotReady",
    "Unknown"
  )
| EVAL cpu_utilization = sum_cpu_usage / sum_allocatable_cpu
| EVAL memory_utilization = sum_memory_usage / TO_DOUBLE(sum_allocatable_memory)
| EVAL pod_utilization = TO_DOUBLE(pod_count) / 110.0
| KEEP k8s.node.name, status, kubelet_version, cpu_utilization, memory_utilization, pod_utilization
| WHERE k8s.node.name != ""`;
};

export const WorkloadResourcesTable: React.FC<WorkloadResourcesTableProps> = ({
  clusterName,
  timeRange,
}) => {
  const query = useMemo(() => buildQuery(clusterName), [clusterName]);

  const { data, loading, error } = useEsqlQuery<NodeData>({
    query,
    timeRange,
  });

  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([
    { id: 'status', direction: 'desc' },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const sortedData = useMemo(() => {
    if (!data || sortingColumns.length === 0) return data ?? [];

    return [...data].sort((a, b) => {
      for (const { id, direction } of sortingColumns) {
        const aValue = a[id as keyof NodeData];
        const bValue = b[id as keyof NodeData];

        // Handle null values
        if (aValue === null && bValue === null) continue;
        if (aValue === null) return direction === 'asc' ? 1 : -1;
        if (bValue === null) return direction === 'asc' ? -1 : 1;

        // Compare values
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        }

        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [data, sortingColumns]);

  const paginatedData = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [sortedData, pagination]);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const node = paginatedData[rowIndex];
      if (!node) return null;

      switch (columnId) {
        case 'status':
          return <StatusBadge status={node.status as NodeStatus} />;

        case 'k8s.node.name':
          return (
            <EuiLink
              data-test-subj="kubernetesPocWorkloadResourcesNodeLink"
              onClick={(e: React.MouseEvent) => e.preventDefault()}
            >
              {node['k8s.node.name']}
            </EuiLink>
          );

        case 'kubelet_version':
          return node.kubelet_version ? (
            <EuiText size="s">{node.kubelet_version}</EuiText>
          ) : (
            <EuiText size="s" color="subdued">
              —
            </EuiText>
          );

        case 'cpu_utilization':
          return <UtilizationCell value={node.cpu_utilization} />;

        case 'memory_utilization':
          return <UtilizationCell value={node.memory_utilization} />;

        case 'pod_utilization':
          return <UtilizationCell value={node.pod_utilization} />;

        default:
          return null;
      }
    },
    [paginatedData]
  );

  const onSort = useCallback((newSortingColumns: EuiDataGridSorting['columns']) => {
    setSortingColumns(newSortingColumns);
  }, []);

  const onChangeItemsPerPage = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, pageIndex: 0 }));
  }, []);

  const onChangePage = useCallback((pageIndex: number) => {
    setPagination((prev) => ({ ...prev, pageIndex }));
  }, []);

  if (loading) {
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiEmptyPrompt
          iconType="warning"
          color="danger"
          title={
            <h3>
              {i18n.translate('xpack.kubernetesPoc.workloadResources.errorTitle', {
                defaultMessage: 'Unable to load workload resources',
              })}
            </h3>
          }
          body={<p>{error.message}</p>}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.kubernetesPoc.workloadResources.title', {
            defaultMessage: 'Workload resources',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDataGrid
        aria-label={i18n.translate('xpack.kubernetesPoc.workloadResources.ariaLabel', {
          defaultMessage: 'Workload resources table',
        })}
        columns={COLUMNS}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns,
        }}
        rowCount={sortedData.length}
        renderCellValue={renderCellValue}
        sorting={{
          columns: sortingColumns,
          onSort,
        }}
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: [5, 10, 25],
          onChangeItemsPerPage,
          onChangePage,
        }}
        toolbarVisibility={{
          showColumnSelector: true,
          showDisplaySelector: false,
          showSortSelector: true,
          showFullScreenSelector: false,
        }}
        gridStyle={{
          border: 'horizontal',
          stripes: true,
          rowHover: 'highlight',
          header: 'shade',
        }}
      />
    </EuiPanel>
  );
};
