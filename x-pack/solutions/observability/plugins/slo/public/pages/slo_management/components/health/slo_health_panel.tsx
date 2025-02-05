/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  EuiBasicTable,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FindSLOHealthSortBy, SLOHealthResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { sloPaths } from '../../../../../common';
import { useKibana } from '../../../../hooks/use_kibana';
import { toSloHealthStatus } from '../../constants';
import { useFetchSloHealth } from '../../hooks/use_fetch_slo_health';
import { SloHealthSearchBar } from './slo_health_search_bar';
import { SloHealthStatusBadge } from './slo_health_status_badge';
import { HealthWrapper } from './slo_health_wrapper';

export function SloHealthPanel() {
  const {
    services: { http },
  } = useKibana();
  const [query, setQuery] = useState<string>();
  const [filters, setFilters] = useState<Filter[]>([]);
  const [statusFilter, setStatusFilter] = useState<Filter>();
  const [sortBy] = useState<FindSLOHealthSortBy>('status');
  const [sortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { isLoading, isError, data } = useFetchSloHealth({
    query,
    filters,
    statusFilter,
    page: pageIndex + 1,
    size: pageSize,
    sortBy,
    sortDirection,
  });

  const columns = [
    {
      field: 'status',
      name: (
        <EuiToolTip content="SLO health status is calculated based on the health of the SLO dependencies like transform states and data ingestion delays">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.statusLabel', {
              defaultMessage: 'Status',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      render: (status: SLOHealthResponse['status']) => {
        return <SloHealthStatusBadge status={status} />;
      },
    },
    {
      width: '15%',
      truncateText: true,
      name: i18n.translate('xpack.slo.sloHealthPanel.columns.nameLabel', {
        defaultMessage: 'Name',
      }),
      render: (item: SLOHealthResponse) => {
        return (
          <EuiLink
            data-test-subj="sloDetailsLink"
            href={http.basePath.prepend(sloPaths.sloDetails(item.id))}
            target="_blank"
          >
            {item.name}
          </EuiLink>
        );
      },
    },
    {
      field: 'instances',
      name: (
        <EuiToolTip content="Total number of instances produced by this SLO">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.instancesLabel', {
              defaultMessage: 'Instances',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      render: (instances: SLOHealthResponse['instances']) => {
        return instances ?? '-';
      },
    },
    {
      name: (
        <EuiToolTip content="Internal model version of the SLO. If the version is outdated, it may not be compatible with the latest features.">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.versionLabel', {
              defaultMessage: 'Version',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.version}>
            {item.health.version === 'healthy'
              ? i18n.translate('xpack.slo.healthPanel.latestLabel', {
                  defaultMessage: 'Latest',
                })
              : i18n.translate('xpack.slo.healthPanel.outdatedLabel', {
                  defaultMessage: 'Outdated',
                })}
          </HealthWrapper>
        );
      },
    },
    {
      name: (
        <EuiToolTip content="Time between the latest rolled-up SLI document and the latest summary update. A short delay is expected. If the delay is too high or keep increasing, the rollup transform should be checked.">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.delayLabel', {
              defaultMessage: 'Delay',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      truncateText: true,
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.delay}>
            {i18n.translate('xpack.slo.healthPanel.durationInMilliseconds', {
              defaultMessage: '{duration} ms',
              values: {
                duration: numeral(item.data.delay).format('0.[00]'),
              },
            })}
          </HealthWrapper>
        );
      },
    },
    {
      name: (
        <EuiToolTip content="Elapsted time since the latest summary update. If the time is too high or keep increasing, the rollup or summary transform should be checked.">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.staleTimeLabel', {
              defaultMessage: 'Stale time',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      truncateText: true,
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.staleTime}>
            {i18n.translate('xpack.slo.healthPanel.durationInMilliseconds', {
              defaultMessage: '{duration} ms',
              values: {
                duration: numeral(item.data.staleTime).format('0.[00]'),
              },
            })}
          </HealthWrapper>
        );
      },
    },
    {
      name: (
        <EuiToolTip content="Indicates if the rollup transform is running and healthy">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.rollupTransformLabel', {
              defaultMessage: 'Rollup transform',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.rollupTransform}>
            {toSloHealthStatus(item.health.rollupTransform)}
          </HealthWrapper>
        );
      },
    },
    {
      name: (
        <EuiToolTip content="Indicates if the summary transform is running and healthy">
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {i18n.translate('xpack.slo.sloHealthPanel.columns.summaryTransformLabel', {
              defaultMessage: 'Summary transform',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" />
          </EuiFlexGroup>
        </EuiToolTip>
      ),
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.summaryTransform}>
            {toSloHealthStatus(item.health.summaryTransform)}
          </HealthWrapper>
        );
      },
    },
  ];

  const onTableChange = ({ page }: Criteria<SLOHealthResponse>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  return (
    <EuiPanel hasBorder={true}>
      <SloHealthSearchBar
        query={query}
        filters={filters}
        statusFilter={statusFilter}
        onSearchChange={({ newQuery, newFilters, newStatusFilter }) => {
          setQuery(newQuery);
          setFilters(newFilters);
          setStatusFilter(newStatusFilter);
        }}
      />
      <EuiSpacer size="m" />
      {!isLoading && !isError && !!data?.results && (
        <EuiBasicTable
          tableCaption={TABLE_CAPTION}
          items={data?.results ?? []}
          rowHeader="status"
          columns={columns}
          pagination={pagination}
          onChange={onTableChange}
        />
      )}
    </EuiPanel>
  );
}

const TABLE_CAPTION = i18n.translate('xpack.slo.sloHealthPanel.tableCaption', {
  defaultMessage: 'SLOs Health',
});
