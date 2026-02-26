/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Criteria as EuiCriteria,
  EuiBasicTableColumn,
  EuiTableSortingType,
} from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SortState, NodeMetricsTableData } from '../shared';
import {
  MetricsNodeDetailsLink,
  MetricsTableEmptyIndicesContent,
  MetricsTableErrorContent,
  MetricsTableLoadingContent,
  MetricsTableNoIndicesContent,
  NumberCell,
  StepwisePagination,
} from '../shared';
import {
  SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
} from '../shared/constants';
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

export const PodMetricsTable = (props: PodMetricsTableProps) => {
  const {
    data,
    isLoading,
    setCurrentPageIndex,
    setSortState,
    sortState,
    timerange,
    isOtel,
    metricIndices,
  } = props;

  const columns = useMemo(
    () => podNodeColumns(timerange, isOtel, metricIndices),
    [timerange, isOtel, metricIndices]
  );

  const sorting: EuiTableSortingType<PodNodeMetricsRow> = {
    enableAllColumns: true,
    sort: sortState,
  };

  const onTableSortChange = ({
    sort = {
      direction: 'desc',
      field: 'averageCpuUsagePercent',
    },
  }: EuiCriteria<PodNodeMetricsRow>) => {
    setSortState(sort);
    setCurrentPageIndex(0);
  };

  if (data.state === 'error') {
    return (
      <>
        {data.errors.map((error) => (
          <MetricsTableErrorContent error={error} />
        ))}
      </>
    );
  } else if (isLoading && data.state !== 'data') {
    return <MetricsTableLoadingContent />;
  } else if (data.state === 'no-indices') {
    return <MetricsTableNoIndicesContent />;
  } else if (data.state === 'empty-indices') {
    return <MetricsTableEmptyIndicesContent />;
  } else if (data.state === 'data') {
    return (
      <>
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.metricsData.metricsTable.pod.tableCaption', {
            defaultMessage: 'Infrastructure metrics for pods',
          })}
          items={data.rows}
          columns={columns}
          sorting={sorting}
          onChange={onTableSortChange}
          loading={isLoading}
          noItemsMessage={<MetricsTableLoadingContent />}
          data-test-subj="podMetricsTable"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <StepwisePagination
              ariaLabel={i18n.translate('xpack.metricsData.metricsTable.pod.paginationAriaLabel', {
                defaultMessage: 'Pod metrics pagination',
              })}
              pageCount={data.pageCount}
              currentPageIndex={data.currentPageIndex}
              setCurrentPageIndex={setCurrentPageIndex}
              data-test-subj="podMetricsTablePagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  } else {
    return null;
  }
};

function podNodeColumns(
  timerange: PodMetricsTableProps['timerange'],
  isOtel?: PodMetricsTableProps['isOtel'],
  metricIndices?: PodMetricsTableProps['metricIndices']
): Array<EuiBasicTableColumn<PodNodeMetricsRow>> {
  return [
    {
      name: i18n.translate('xpack.metricsData.metricsTable.pod.nameColumnHeader', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      truncateText: true,
      textOnly: true,
      render: (_, { id, name }) => {
        return (
          <MetricsNodeDetailsLink
            id={id}
            label={name}
            nodeType={'pod'}
            timerange={timerange}
            isOtel={isOtel}
            metricsIndices={metricIndices}
          />
        );
      },
    },
    {
      name: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.metricsData.metricsTable.pod.averageCpuUsagePercentColumnHeader',
              {
                defaultMessage: 'CPU usage (avg.)',
              }
            )}
          </EuiFlexItem>
          {isOtel ? (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.metricsData.metricsTable.pod.metricsOptionalTooltip',
                  {
                    defaultMessage:
                      '{metricName} is optional and may not appear for all pods. Visibility depends on your Kubernetes metrics collection setup.',
                    values: {
                      metricName: SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
                    },
                  }
                )}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
      field: 'averageCpuUsagePercent',
      align: 'right',
      render: (averageCpuUsagePercent: number) => (
        <NumberCell value={averageCpuUsagePercent} unit="%" />
      ),
    },
    {
      name: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.metricsData.metricsTable.pod.averageMemoryUsagePercentColumnHeader',
              {
                defaultMessage: 'Memory usage (avg.)',
              }
            )}
          </EuiFlexItem>
          {isOtel ? (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.metricsData.metricsTable.pod.metricsOptionalTooltip',
                  {
                    defaultMessage:
                      '{metricName} is optional and may not appear for all pods. Visibility depends on your Kubernetes metrics collection setup.',
                    values: {
                      metricName: SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
                    },
                  }
                )}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
      field: 'averageMemoryUsagePercent',
      align: 'right',
      render: (averageMemoryUsagePercent: number) => (
        <NumberCell value={averageMemoryUsagePercent} unit="%" />
      ),
    },
  ];
}
