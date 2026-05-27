/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useMemo } from 'react';
import type { BoolQuery } from '@kbn/es-query';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsPageReady } from './use_hosts_page_ready';
import type {
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
  InfraEntityMetricType,
} from '../../../../../common/http_api';
import type { StringDateRange } from './use_unified_search_url_state';

const COMMON_HOST_METRICS: InfraEntityMetricType[] = [
  'cpuV2',
  'diskSpaceUsage',
  'memory',
  'memoryFree',
  'normalizedLoad1m',
];
const HOST_TABLE_METRICS: InfraEntityMetricType[] = [...COMMON_HOST_METRICS, 'rxV2', 'txV2'];
const OTEL_HOSTS_TABLE_METRICS: InfraEntityMetricType[] = [...COMMON_HOST_METRICS];

const HOSTS_PATH = '/api/metrics/infra/host';

export const useHostsView = () => {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();

  const schema = searchCriteria?.preferredSchema || DEFAULT_SCHEMA;
  const metrics = schema === 'semconv' ? OTEL_HOSTS_TABLE_METRICS : HOST_TABLE_METRICS;

  const payload = useMemo<string>(
    () =>
      JSON.stringify(
        buildRequestPayload({
          dateRange: parsedDateRange,
          esQuery: buildQuery(),
          limit: searchCriteria.limit,
          metrics,
          schema,
        })
      ),
    [buildQuery, parsedDateRange, searchCriteria.limit, metrics, schema]
  );

  const { data, error, status } = useFetcher(
    (callApi) => {
      if (!isReady) return;
      return (async () => {
        const start = performance.now();
        const response = await callApi<GetInfraMetricsResponsePayload>(HOSTS_PATH, {
          method: 'POST',
          body: payload,
        });
        const duration = performance.now() - start;
        telemetry.reportPerformanceMetricEvent(
          'infra_hosts_table_load',
          duration,
          { key1: 'data_load', value1: duration },
          { limit: searchCriteria.limit }
        );
        return response;
      })();
    },
    [isReady, payload, searchCriteria.limit, telemetry]
  );

  const hostNodes = data?.nodes ?? [];
  const totalHosts = hostNodes.length;

  return {
    loading: isPending(status),
    error: error ?? undefined,
    hostNodes,
    totalHosts,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

function buildRequestPayload({
  esQuery,
  dateRange,
  limit,
  metrics,
  schema,
}: {
  esQuery: { bool: BoolQuery };
  dateRange: StringDateRange;
  limit: number;
  metrics: InfraEntityMetricType[];
  schema?: DataSchemaFormat;
}): GetInfraMetricsRequestBodyPayloadClient {
  return {
    query: esQuery,
    from: dateRange.from,
    to: dateRange.to,
    metrics,
    limit,
    schema,
  };
}
