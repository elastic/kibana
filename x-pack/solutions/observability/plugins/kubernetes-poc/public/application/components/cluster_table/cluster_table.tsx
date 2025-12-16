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
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiButtonIcon,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ClusterData, HealthStatus } from '../../../../common/cluster_listing';

interface ClusterTableProps {
  clusters: ClusterData[];
  onExpandCluster?: (cluster: ClusterData) => void;
}

const COLUMNS: EuiDataGridColumn[] = [
  {
    id: 'healthStatus',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.healthColumn', {
      defaultMessage: 'Health',
    }),
    initialWidth: 110,
    isSortable: true,
  },
  {
    id: 'clusterName',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.clusterColumn', {
      defaultMessage: 'Cluster',
    }),
    isSortable: true,
  },
  {
    id: 'cloudProvider',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.providerColumn', {
      defaultMessage: 'Provider',
    }),
    initialWidth: 90,
    isSortable: true,
  },
  {
    id: 'totalNodes',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.nodesColumn', {
      defaultMessage: 'Nodes',
    }),
    initialWidth: 80,
    isSortable: true,
  },
  {
    id: 'totalNamespaces',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.namespacesColumn', {
      defaultMessage: 'Namespaces',
    }),
    initialWidth: 110,
    isSortable: true,
  },
  {
    id: 'podStatuses',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.podStatusesColumn', {
      defaultMessage: 'Pods',
    }),
    initialWidth: 130,
    isSortable: false,
  },
  {
    id: 'cpuUtilization',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.cpuColumn', {
      defaultMessage: 'CPU Util.',
    }),
    initialWidth: 120,
    isSortable: true,
  },
  {
    id: 'memoryUtilization',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.memoryColumn', {
      defaultMessage: 'Memory Util.',
    }),
    initialWidth: 150,
    isSortable: true,
  },
  {
    id: 'volumeUtilization',
    displayAsText: i18n.translate('xpack.kubernetesPoc.clusterTable.volumeColumn', {
      defaultMessage: 'Volume Util.',
    }),
    initialWidth: 150,
    isSortable: true,
  },
];

interface HealthBadgeProps {
  status: HealthStatus;
  onExpand?: () => void;
}

const HealthBadge: React.FC<HealthBadgeProps> = ({ status, onExpand }) => {
  const color = status === 'healthy' ? 'success' : 'danger';
  const label =
    status === 'healthy'
      ? i18n.translate('xpack.kubernetesPoc.clusterTable.healthyLabel', {
          defaultMessage: 'Healthy',
        })
      : i18n.translate('xpack.kubernetesPoc.clusterTable.unhealthyLabel', {
          defaultMessage: 'Unhealthy',
        });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="kubernetesPocHealthBadgeButton"
          iconType="expand"
          aria-label={i18n.translate('xpack.kubernetesPoc.clusterTable.expandClusterLabel', {
            defaultMessage: 'Expand cluster details',
          })}
          size="xs"
          onClick={onExpand}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={color}>{label}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CloudProviderCell: React.FC<{ provider: string | null }> = ({ provider }) => {
  if (!provider) {
    return (
      <EuiText size="s" color="subdued">
        —
      </EuiText>
    );
  }

  const providerIcons: Record<string, string> = {
    aws: 'logoAWS',
    gcp: 'logoGCP',
    azure: 'logoAzure',
  };

  const icon = providerIcons[provider.toLowerCase()];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="s">{provider}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface PodStatusCellProps {
  running: number;
  failed: number;
}

const PodStatusCell: React.FC<PodStatusCellProps> = ({ running, failed }) => {
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      style={{ flexShrink: 0 }}
    >
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        <EuiToolTip
          content={i18n.translate('xpack.kubernetesPoc.clusterTable.runningPodsTooltip', {
            defaultMessage: 'Running pods',
          })}
        >
          <EuiBadge tabIndex={0} color="success">
            {running}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        <EuiToolTip
          content={i18n.translate('xpack.kubernetesPoc.clusterTable.failedPodsTooltip', {
            defaultMessage: 'Failed pods',
          })}
        >
          <EuiBadge tabIndex={0} color="danger">
            {failed}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
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

  const color = getColor(value);
  const displayValue = Math.min(100, Math.max(0, value));

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} style={{ minWidth: 50 }}>
        <EuiText size="s">{value.toFixed(2)}%</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiProgress value={displayValue} max={100} size="m" color={color} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ClusterTable: React.FC<ClusterTableProps> = ({ clusters, onExpandCluster }) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([
    { id: 'healthStatus', direction: 'desc' },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const sortedData = useMemo(() => {
    if (sortingColumns.length === 0) return clusters;

    return [...clusters].sort((a, b) => {
      for (const { id, direction } of sortingColumns) {
        const aValue = a[id as keyof ClusterData];
        const bValue = b[id as keyof ClusterData];

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
  }, [clusters, sortingColumns]);

  const paginatedData = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [sortedData, pagination]);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const cluster = paginatedData[rowIndex];
      if (!cluster) return null;

      switch (columnId) {
        case 'healthStatus':
          return (
            <HealthBadge
              status={cluster.healthStatus}
              onExpand={() => onExpandCluster?.(cluster)}
            />
          );

        case 'clusterName':
          return (
            <EuiLink
              data-test-subj="kubernetesPocClusterNameLink"
              onClick={() => onExpandCluster?.(cluster)}
            >
              {cluster.clusterName}
            </EuiLink>
          );

        case 'cloudProvider':
          return <CloudProviderCell provider={cluster.cloudProvider} />;

        case 'totalNodes':
          return <EuiText size="s">{cluster.totalNodes}</EuiText>;

        case 'totalNamespaces':
          return <EuiText size="s">{cluster.totalNamespaces}</EuiText>;

        case 'podStatuses':
          return <PodStatusCell running={cluster.runningPods} failed={cluster.failedPods} />;

        case 'cpuUtilization':
          return <UtilizationCell value={cluster.cpuUtilization} />;

        case 'memoryUtilization':
          return <UtilizationCell value={cluster.memoryUtilization} />;

        case 'volumeUtilization':
          return <UtilizationCell value={cluster.volumeUtilization} />;

        default:
          return null;
      }
    },
    [paginatedData, onExpandCluster]
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

  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.kubernetesPoc.clusterTable.h2.clustersLabel', {
            defaultMessage: 'Clusters',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDataGrid
        aria-label={i18n.translate('xpack.kubernetesPoc.clusterTable.ariaLabel', {
          defaultMessage: 'Kubernetes clusters table',
        })}
        columns={COLUMNS}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns,
        }}
        rowCount={clusters.length}
        renderCellValue={renderCellValue}
        sorting={{
          columns: sortingColumns,
          onSort,
        }}
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: [10, 25, 50, 100],
          onChangeItemsPerPage,
          onChangePage,
        }}
        toolbarVisibility={{
          showColumnSelector: true,
          showDisplaySelector: true,
          showSortSelector: true,
          showFullScreenSelector: true,
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
