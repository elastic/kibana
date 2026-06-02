/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import createContainer from 'constate';
import type { BoolQuery } from '@kbn/es-query';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from './use_unified_search';
// First-paint double-fire gate. The same gate is used by `useHostCount`
// and `useHostsKpisEsql` so all three fetchers fire once after the unified
// search context settles instead of twice — and so the `/host` request and
// the client-side ES|QL KPI query start in the same animation frame (max,
// not sum).
import { useHostsPageReady } from './use_hosts_page_ready';
import { markOnce, measureSince } from '../utils/perf_marks';
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

const BASE_INFRA_METRICS_PATH = '/api/metrics/infra';

export const useHostsView = () => {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();

  const payload = useMemo(
    () =>
      JSON.stringify(
        createInfraMetricsRequest({
          dateRange: parsedDateRange,
          esQuery: buildQuery(),
          limit: searchCriteria.limit,
          schema: searchCriteria?.preferredSchema || DEFAULT_SCHEMA,
        })
      ),
    [buildQuery, parsedDateRange, searchCriteria.limit, searchCriteria.preferredSchema]
  );

  const { data, error, status } = useFetcher(
    (callApi) => {
      // Return `undefined` until prerequisites settle so `useFetcher`
      // skips the initial double-fire. See `useHostsPageReady`.
      if (!isReady) return;
      return (async () => {
        const start = performance.now();
        const metricsResponse = await callApi<GetInfraMetricsResponsePayload>(
          `${BASE_INFRA_METRICS_PATH}/host`,
          {
            method: 'POST',
            body: payload,
          }
        );
        const duration = performance.now() - start;
        telemetry.reportPerformanceMetricEvent(
          'infra_hosts_table_load',
          duration,
          { key1: 'data_load', value1: duration },
          { limit: searchCriteria.limit }
        );
        return metricsResponse;
      })();
    },
    [isReady, payload, searchCriteria.limit, telemetry]
  );

  const loading = isPending(status);
  const hasMarkedTableReadyRef = useRef(false);
  const prevLoadingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevLoadingRef.current === true && !loading && !hasMarkedTableReadyRef.current) {
      markOnce('infra.hosts.tableReady');
      measureSince('infra.hosts.tableReadyDuration', 'infra.hosts.navigationStart');
      hasMarkedTableReadyRef.current = true;
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  return {
    loading,
    error,
    hostNodes: data?.nodes ?? [],
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;

/**
 * Helpers
 */

const createInfraMetricsRequest = ({
  esQuery,
  dateRange,
  limit,
  schema,
}: {
  esQuery: { bool: BoolQuery };
  dateRange: StringDateRange;
  limit: number;
  schema?: DataSchemaFormat;
}): GetInfraMetricsRequestBodyPayloadClient => ({
  query: esQuery,
  from: dateRange.from,
  to: dateRange.to,
  metrics: schema === 'semconv' ? OTEL_HOSTS_TABLE_METRICS : HOST_TABLE_METRICS,
  limit,
  schema,
});
