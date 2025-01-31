/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { SLOHealthResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { Filter } from '@kbn/es-query';
import { useFetchSloHealth } from '../../hooks/use_fetch_slo_health';
import { SloHealthStatusBadge } from './slo_health_status_badge';
import { HealthWrapper } from './slo_health_wrapper';
import { toSloHealthStatus } from '../../constants';
import { SloHealthSearchBar } from './slo_health_search_bar';

export function SloHealthPanel() {
  const [query, setQuery] = useState<string | undefined>();
  const [filters, setFilters] = useState<Filter[]>([]);
  const { isLoading, isError, data } = useFetchSloHealth({
    query,
    filters,
    sortBy: 'status',
    sortDirection: 'desc',
  });

  const columns = [
    {
      field: 'status',
      name: 'Status',
      render: (status: SLOHealthResponse['status']) => {
        return <SloHealthStatusBadge status={status} />;
      },
    },
    {
      field: 'name',
      name: 'Name',
    },
    {
      field: 'tags',
      name: 'Tags',
      render: (tags: SLOHealthResponse['tags']) => {
        return tags.map((t) => (
          <EuiBadge key={t} color="hollow">
            {t}
          </EuiBadge>
        ));
      },
    },
    {
      field: 'instances',
      name: 'Instances',
      render: (instances: SLOHealthResponse['instances']) => {
        return instances ?? '-';
      },
    },
    {
      name: 'Version',
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
      name: 'Delay',
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
      name: 'Stale time',
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
      name: 'Rollup transform',
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.rollupTransform}>
            {toSloHealthStatus(item.health.rollupTransform)}
          </HealthWrapper>
        );
      },
    },
    {
      name: 'Summary transform',
      description: 'is everything fine?',
      render: (item: SLOHealthResponse) => {
        return (
          <HealthWrapper status={item.health.summaryTransform}>
            {toSloHealthStatus(item.health.summaryTransform)}
          </HealthWrapper>
        );
      },
    },
  ];

  return (
    <EuiPanel hasBorder={true}>
      <SloHealthSearchBar
        query={query}
        filters={filters}
        onSearchChange={(newQuery: string, newFilters: Filter[]) => {
          setQuery(newQuery);
          setFilters(newFilters);
        }}
      />
      <EuiSpacer size="m" />
      {!isLoading && !isError && !!data?.results && (
        <EuiBasicTable
          tableCaption="SLOs Health"
          items={data?.results ?? []}
          rowHeader="status"
          columns={columns}
        />
      )}
    </EuiPanel>
  );
}
