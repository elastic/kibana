/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { EuiDataGridColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';
import {
  EuiDataGrid,
  EuiBadge,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiLink,
  EuiSuperSelect,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { useEsqlQuery } from '../../../../hooks/use_esql_query';

interface WorkloadResourcesTableProps {
  clusterName: string;
  timeRange: TimeRange;
}

interface WorkloadData {
  workload_name: string;
  workload_type: string;
  'k8s.namespace.name': string;
  avg_cpu_usage: number | null;
  avg_memory_usage: number | null;
}

const COLUMNS: EuiDataGridColumn[] = [
  {
    id: 'workload_name',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.workloadColumn', {
      defaultMessage: 'Workload',
    }),
    isSortable: true,
  },
  {
    id: 'workload_type',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.typeColumn', {
      defaultMessage: 'Type',
    }),
    initialWidth: 130,
    isSortable: true,
  },
  {
    id: 'k8s.namespace.name',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.namespaceColumn', {
      defaultMessage: 'Namespace',
    }),
    initialWidth: 150,
    isSortable: true,
  },
  {
    id: 'avg_cpu_usage',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.cpuAvgColumn', {
      defaultMessage: 'CPU avg.',
    }),
    initialWidth: 150,
    isSortable: true,
  },
  {
    id: 'avg_memory_usage',
    displayAsText: i18n.translate('xpack.kubernetesPoc.workloadResources.memoryAvgColumn', {
      defaultMessage: 'Memory avg.',
    }),
    initialWidth: 150,
    isSortable: true,
  },
];

type WorkloadType = 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob' | 'Unknown';
type WorkloadTypeFilter = 'Any' | WorkloadType;

const WORKLOAD_TYPE_OPTIONS: Array<EuiSuperSelectOption<WorkloadTypeFilter>> = [
  {
    value: 'Any',
    inputDisplay: i18n.translate('xpack.kubernetesPoc.workloadResources.filter.any', {
      defaultMessage: 'Any',
    }),
  },
  {
    value: 'Deployment',
    inputDisplay: i18n.translate('xpack.kubernetesPoc.workloadResources.filter.deployment', {
      defaultMessage: 'Deployment',
    }),
  },
  {
    value: 'StatefulSet',
    inputDisplay: i18n.translate('xpack.kubernetesPoc.workloadResources.filter.statefulset', {
      defaultMessage: 'StatefulSet',
    }),
  },
  {
    value: 'DaemonSet',
    inputDisplay: i18n.translate('xpack.kubernetesPoc.workloadResources.filter.daemonset', {
      defaultMessage: 'DaemonSet',
    }),
  },
  {
    value: 'Job',
    inputDisplay: i18n.translate('xpack.kubernetesPoc.workloadResources.filter.job', {
      defaultMessage: 'Job',
    }),
  },
  {
    value: 'CronJob',
    inputDisplay: i18n.translate('xpack.kubernetesPoc.workloadResources.filter.cronjob', {
      defaultMessage: 'CronJob',
    }),
  },
];

const WorkloadTypeBadge: React.FC<{ type: WorkloadType }> = ({ type }) => {
  const getColor = (t: WorkloadType): string => {
    switch (t) {
      case 'Deployment':
        return 'primary';
      case 'StatefulSet':
        return 'success';
      case 'DaemonSet':
        return 'warning';
      case 'Job':
        return 'accent';
      case 'CronJob':
        return 'hollow';
      case 'Unknown':
      default:
        return 'default';
    }
  };

  return <EuiBadge color={getColor(type)}>{type}</EuiBadge>;
};

interface ResourceCellProps {
  value: number | null;
  type: 'cpu' | 'memory';
}

const ResourceCell: React.FC<ResourceCellProps> = ({ value, type }) => {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <EuiText size="s" color="subdued">
        —
      </EuiText>
    );
  }

  // Format CPU as cores (e.g., "0.25 cores")
  if (type === 'cpu') {
    const cores = value.toFixed(3);
    return (
      <EuiText size="s">
        {cores}{' '}
        {i18n.translate('xpack.kubernetesPoc.resourceCell.coresTextLabel', {
          defaultMessage: 'cores',
        })}
      </EuiText>
    );
  }

  // Format memory as human-readable bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return <EuiText size="s">{formatBytes(value)}</EuiText>;
};

const buildQuery = (clusterName: string): string => {
  return `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.namespace.name IS NOT NULL
  AND (
    k8s.deployment.name IS NOT NULL
    OR k8s.statefulset.name IS NOT NULL
    OR k8s.daemonset.name IS NOT NULL
    OR k8s.job.name IS NOT NULL
    OR k8s.cronjob.name IS NOT NULL
  )
  AND (
    k8s.pod.cpu.usage IS NOT NULL
    OR k8s.pod.memory.usage IS NOT NULL
  )
| STATS
    sum_cpu_usage = SUM(k8s.pod.cpu.usage),
    sum_memory_usage = SUM(k8s.pod.memory.usage),
    pod_count = COUNT_DISTINCT(k8s.pod.uid)
  BY k8s.deployment.name, k8s.statefulset.name, k8s.daemonset.name, k8s.job.name, k8s.cronjob.name, k8s.namespace.name
| EVAL workload_name = COALESCE(k8s.deployment.name, k8s.statefulset.name, k8s.daemonset.name, k8s.job.name, k8s.cronjob.name)
| EVAL workload_type = CASE(
    k8s.deployment.name IS NOT NULL, "Deployment",
    k8s.statefulset.name IS NOT NULL, "StatefulSet",
    k8s.daemonset.name IS NOT NULL, "DaemonSet",
    k8s.job.name IS NOT NULL, "Job",
    k8s.cronjob.name IS NOT NULL, "CronJob",
    "Unknown"
  )
| EVAL avg_cpu_usage = sum_cpu_usage / TO_DOUBLE(pod_count)
| EVAL avg_memory_usage = sum_memory_usage / TO_DOUBLE(pod_count)
| KEEP workload_name, workload_type, k8s.namespace.name, avg_cpu_usage, avg_memory_usage
| WHERE workload_name IS NOT NULL
| SORT workload_name ASC, k8s.namespace.name ASC`;
};

export const WorkloadResourcesTable: React.FC<WorkloadResourcesTableProps> = ({
  clusterName,
  timeRange,
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMNS.map((col) => col.id));
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [typeFilter, setTypeFilter] = useState<WorkloadTypeFilter>('Any');

  const query = useMemo(() => buildQuery(clusterName), [clusterName]);

  const { data, loading, error } = useEsqlQuery<WorkloadData>({
    query,
    timeRange,
  });

  // Filter data by workload type
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (typeFilter === 'Any') return data;
    return data.filter((item) => item.workload_type === typeFilter);
  }, [data, typeFilter]);

  // Reset pagination when filter changes
  const onTypeFilterChange = useCallback((value: WorkloadTypeFilter) => {
    setTypeFilter(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      // EuiDataGrid passes the absolute rowIndex when pagination is enabled
      // We need to map it to our filtered data array
      const workload = filteredData[rowIndex];
      if (!workload) {
        return null;
      }

      switch (columnId) {
        case 'workload_name':
          return (
            <EuiLink
              data-test-subj="kubernetesPocWorkloadResourcesWorkloadLink"
              onClick={(e: React.MouseEvent) => e.preventDefault()}
            >
              {workload.workload_name}
            </EuiLink>
          );

        case 'workload_type':
          return <WorkloadTypeBadge type={workload.workload_type as WorkloadType} />;

        case 'k8s.namespace.name':
          return <EuiText size="s">{workload['k8s.namespace.name']}</EuiText>;

        case 'avg_cpu_usage':
          return <ResourceCell value={workload.avg_cpu_usage} type="cpu" />;

        case 'avg_memory_usage':
          return <ResourceCell value={workload.avg_memory_usage} type="memory" />;

        default:
          return null;
      }
    },
    [filteredData]
  );

  // Note: Sorting is handled by the ES|QL query, not client-side
  // Client-side sorting is disabled to avoid conflicts with server-side sorting

  const onChangeItemsPerPage = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, pageIndex: 0 }));
  }, []);

  const onChangePage = useCallback((pageIndex: number) => {
    setPagination((prev) => ({ ...prev, pageIndex }));
  }, []);

  // Custom empty state message based on filter - must be before early returns
  const noDataMessage = useMemo(() => {
    if (typeFilter === 'Any') {
      return i18n.translate('xpack.kubernetesPoc.workloadResources.emptyBodyNoData', {
        defaultMessage: 'No workload resources are available for this cluster.',
      });
    }
    return i18n.translate('xpack.kubernetesPoc.workloadResources.emptyBodyFiltered', {
      defaultMessage: 'No {workloadType} workloads found. Try selecting a different type.',
      values: { workloadType: typeFilter },
    });
  }, [typeFilter]);

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
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.kubernetesPoc.workloadResources.title', {
                defaultMessage: 'Workload resources',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperSelect
            options={WORKLOAD_TYPE_OPTIONS}
            valueOfSelected={typeFilter}
            onChange={onTypeFilterChange}
            compressed
            prepend={i18n.translate('xpack.kubernetesPoc.workloadResources.typeFilterLabel', {
              defaultMessage: 'Type',
            })}
            style={{ minWidth: 150 }}
            data-test-subj="kubernetesPocWorkloadTypeFilter"
            aria-label={i18n.translate(
              'xpack.kubernetesPoc.workloadResources.typeFilterAriaLabel',
              {
                defaultMessage: 'Filter workloads by type',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {filteredData.length > 0 ? (
        <EuiDataGrid
          aria-label={i18n.translate('xpack.kubernetesPoc.workloadResources.ariaLabel', {
            defaultMessage: 'Workload resources table',
          })}
          columns={COLUMNS}
          columnVisibility={{
            visibleColumns,
            setVisibleColumns,
          }}
          rowCount={filteredData.length}
          renderCellValue={renderCellValue}
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
            showSortSelector: false,
            showFullScreenSelector: false,
          }}
          gridStyle={{
            border: 'horizontal',
            stripes: true,
            rowHover: 'highlight',
            header: 'shade',
          }}
        />
      ) : (
        <EuiEmptyPrompt
          iconType="search"
          titleSize="xs"
          title={
            <h3>
              {i18n.translate('xpack.kubernetesPoc.workloadResources.emptyTitle', {
                defaultMessage: 'No workloads found',
              })}
            </h3>
          }
          body={<p>{noDataMessage}</p>}
        />
      )}
    </EuiPanel>
  );
};
