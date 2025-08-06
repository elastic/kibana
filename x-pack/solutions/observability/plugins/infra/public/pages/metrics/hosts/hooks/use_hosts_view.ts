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

import { useMemo } from 'react';
import createContainer from 'constate';
import type { BoolQuery } from '@kbn/es-query';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from './use_unified_search';
import type {
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
  InfraEntityMetricType,
} from '../../../../../common/http_api';
import type { StringDateRange } from './use_unified_search_url_state';

const HOST_TABLE_METRICS: InfraEntityMetricType[] = [
  'cpuV2',
  'diskSpaceUsage',
  'memory',
  'memoryFree',
  'normalizedLoad1m',
  'rxV2',
  'txV2',
];

const BASE_INFRA_METRICS_PATH = '/api/metrics/infra';

export const useHostsView = () => {
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();

  const payload = useMemo(
    () =>
      JSON.stringify(
        createInfraMetricsRequest({
          dateRange: parsedDateRange,
          esQuery: buildQuery(),
          limit: searchCriteria.limit,
          schema: searchCriteria?.preferredSchema || 'ecs',
        })
      ),
    [buildQuery, parsedDateRange, searchCriteria.limit, searchCriteria.preferredSchema]
  );

  const { data, error, status } = useFetcher(
    async (callApi) => {
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
    },
    [payload, searchCriteria.limit, telemetry]
  );

  return {
    loading: isPending(status),
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
  metrics:
    schema === 'ecs'
      ? HOST_TABLE_METRICS
      : HOST_TABLE_METRICS.filter((metric) => !['rxV2', 'txV2'].includes(metric)),
  limit,
  schema,
});
