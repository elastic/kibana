/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, EuiLink, EuiLoadingChart } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { createInventoryMetricFormatter } from '../../pages/metrics/inventory_view/lib/create_inventory_metric_formatter';
import type {
  GetInfraMetricsResponsePayload,
  InfraEntityMetricsItem,
  InfraEntityMetricType,
} from '../../../common/http_api/infra';

interface OverviewHostsTableProps {
  dateRange: { from: number; to: number };
  schema?: 'ecs' | 'semconv';
}

const METRICS: InfraEntityMetricType[] = ['cpuV2', 'normalizedLoad1m', 'memoryFree'];

const formatMetric = (type: InfraEntityMetricType, value: number | null) => {
  if (value === null) return 'N/A';
  return createInventoryMetricFormatter({ type })(value);
};

export const OverviewHostsTable: React.FC<OverviewHostsTableProps> = ({ dateRange, schema }) => {
  const { http } = useKibana().services;

  const { data, status } = useFetcher(
    async ({ signal }) => {
      const response = await http.post<GetInfraMetricsResponsePayload>('/api/metrics/infra/host', {
        body: JSON.stringify({
          limit: 5,
          metrics: METRICS,
          from: new Date(dateRange.from).toISOString(),
          to: new Date(dateRange.to).toISOString(),
          ...(schema ? { schema } : {}),
        }),
        signal,
      });
      return response;
    },
    [dateRange.from, dateRange.to, schema, http]
  );

  const columns: Array<EuiBasicTableColumn<InfraEntityMetricsItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.infra.overviewHostsTable.hostname', {
          defaultMessage: 'Hostname',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string) => (
          <EuiLink
            href={http.basePath.prepend(`/app/metrics/hosts?host=${encodeURIComponent(name)}`)}
            data-test-subj="overviewHostsTableHostLink"
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'metrics',
        name: i18n.translate('xpack.infra.overviewHostsTable.cpu', { defaultMessage: 'CPU %' }),
        render: (metrics: InfraEntityMetricsItem['metrics']) =>
          formatMetric('cpuV2', metrics.find((m) => m.name === 'cpuV2')?.value ?? null),
      },
      {
        field: 'metrics',
        name: i18n.translate('xpack.infra.overviewHostsTable.load', {
          defaultMessage: 'Normalized Load',
        }),
        render: (metrics: InfraEntityMetricsItem['metrics']) =>
          formatMetric('normalizedLoad1m', metrics.find((m) => m.name === 'normalizedLoad1m')?.value ?? null),
      },
      {
        field: 'metrics',
        name: i18n.translate('xpack.infra.overviewHostsTable.memory', {
          defaultMessage: 'Memory Free',
        }),
        render: (metrics: InfraEntityMetricsItem['metrics']) =>
          formatMetric('memoryFree', metrics.find((m) => m.name === 'memoryFree')?.value ?? null),
      },
    ],
    [http]
  );

  if (status === FETCH_STATUS.LOADING && !data) {
    return (
      <div
        style={{
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiLoadingChart size="l" />
      </div>
    );
  }

  return (
    <EuiBasicTable
      items={data?.nodes ?? []}
      columns={columns}
      loading={status === FETCH_STATUS.LOADING}
      tableCaption={i18n.translate('xpack.infra.overviewHostsTable.caption', {
        defaultMessage: 'Host metrics overview',
      })}
    />
  );
};
