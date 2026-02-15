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
import React, { useCallback, useMemo } from 'react';
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
import type { ContainerSemconvRuntime } from './container_metrics_configs';
import {
  SEMCONV_CONTAINER_CPU_LIMIT_UTILIZATION_DISPLAY,
  SEMCONV_CONTAINER_MEMORY_LIMIT_UTILIZATION_DISPLAY,
} from '../shared/constants';
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
  /** When true, use OpenTelemetry SemConv metrics (equivalent to schema === 'semconv'). */
  isOtel?: boolean;
  metricsIndices?: string;
  /** When isOtel is true, used to choose correct unit for memory (e.g. % for k8s, MB for docker). */
  semconvRuntime?: ContainerSemconvRuntime;
}

export const ContainerMetricsTable = (props: ContainerMetricsTableProps) => {
  const {
    data,
    isLoading,
    setCurrentPageIndex,
    setSortState,
    sortState,
    timerange,
    isOtel,
    metricsIndices,
    semconvRuntime,
  } = props;

  const columns = useMemo(
    () => containerNodeColumns({ timerange, isOtel, metricsIndices, semconvRuntime }),
    [timerange, isOtel, metricsIndices, semconvRuntime]
  );

  const sortSettings: EuiTableSortingType<ContainerNodeMetricsRow> = {
    enableAllColumns: true,
    sort: sortState,
  };

  const onTableSortChange = useCallback(
    ({ sort }: EuiCriteria<ContainerNodeMetricsRow>) => {
      if (!sort) {
        return;
      }

      setSortState(sort);
      setCurrentPageIndex(0);
    },
    [setSortState, setCurrentPageIndex]
  );

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
          tableCaption={i18n.translate('xpack.metricsData.metricsTable.container.tableCaption', {
            defaultMessage: 'Infrastructure metrics for containers',
          })}
          items={data.rows}
          columns={columns}
          sorting={sortSettings}
          onChange={onTableSortChange}
          loading={isLoading}
          noItemsMessage={<MetricsTableLoadingContent />}
          data-test-subj="containerMetricsTable"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <StepwisePagination
              ariaLabel={i18n.translate(
                'xpack.metricsData.metricsTable.container.paginationAriaLabel',
                {
                  defaultMessage: 'Container metrics pagination',
                }
              )}
              pageCount={data.pageCount}
              currentPageIndex={data.currentPageIndex}
              setCurrentPageIndex={setCurrentPageIndex}
              data-test-subj="containerMetricsTablePagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  } else {
    return null;
  }
};

function containerNodeColumns({
  timerange,
  isOtel,
  metricsIndices,
  semconvRuntime,
}: Pick<
  ContainerMetricsTableProps,
  'timerange' | 'isOtel' | 'metricsIndices' | 'semconvRuntime'
>): Array<EuiBasicTableColumn<ContainerNodeMetricsRow>> {
  const memoryUnit = isOtel && semconvRuntime === 'k8s' ? '%' : ' MB';
  return [
    {
      name: i18n.translate('xpack.metricsData.metricsTable.container.idColumnHeader', {
        defaultMessage: 'Id',
      }),
      field: 'id',
      truncateText: true,
      textOnly: true,
      render: (id: string) => {
        return (
          <MetricsNodeDetailsLink
            id={id}
            label={id}
            nodeType={'container'}
            timerange={timerange}
            isOtel={isOtel}
            metricsIndices={metricsIndices}
          />
        );
      },
    },
    {
      name: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.metricsData.metricsTable.container.averageCpuUsagePercentColumnHeader',
              {
                defaultMessage: 'CPU usage (avg.)',
              }
            )}
          </EuiFlexItem>
          {isOtel ? (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.metricsData.metricsTable.container.metricsOptionalTooltip',
                  {
                    defaultMessage:
                      '{metricName} is optional and may not appear for all containers. Visibility depends on your container metrics collection setup.',
                    values: {
                      metricName: SEMCONV_CONTAINER_CPU_LIMIT_UTILIZATION_DISPLAY,
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
              'xpack.metricsData.metricsTable.container.averageMemoryUsageMegabytesColumnHeader',
              {
                defaultMessage: 'Memory usage(avg.)',
              }
            )}
          </EuiFlexItem>
          {isOtel ? (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.metricsData.metricsTable.container.metricsOptionalTooltip',
                  {
                    defaultMessage:
                      '{metricName} is optional and may not appear for all containers. Visibility depends on your container metrics collection setup.',
                    values: {
                      metricName: SEMCONV_CONTAINER_MEMORY_LIMIT_UTILIZATION_DISPLAY,
                    },
                  }
                )}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
      field: 'averageMemoryUsageMegabytes',
      align: 'right',
      render: (averageMemoryUsageMegabytes: number) => (
        <NumberCell value={averageMemoryUsageMegabytes} unit={memoryUnit} />
      ),
    },
  ];
}
