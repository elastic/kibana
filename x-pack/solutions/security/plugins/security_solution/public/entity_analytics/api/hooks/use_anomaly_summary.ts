/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type {
  AnomalySummaryRequestBody,
  GetAnomalySummaryRequestBodyInput,
} from '../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api';

export const ANOMALY_SUMMARY_QUERY_KEY = ['POST', 'FETCH_ANOMALY_SUMMARY'] as const;

interface UseAnomalySummaryParams {
  /** Entity Store ids to cover: the target first, then any resolution-group aliases. */
  entityIds: string[];
  entityType: string;
  body?: Omit<GetAnomalySummaryRequestBodyInput, 'entity_ids'>;
  enabled?: boolean;
  /**
   * Optional Kibana execution context forwarded to the anomaly-summary fetch so slow logs and
   * APM traces can attribute the query to the calling page/panel.
   */
  executionContext?: KibanaExecutionContext;
}

type AnomalySummaryBody = Omit<AnomalySummaryRequestBody, 'entity_ids'>;

const DEFAULT_BODY: Required<Pick<AnomalySummaryBody, 'page' | 'page_size' | 'sort'>> = {
  page: 1,
  page_size: 10,
  sort: [{ field: 'timestamp', order: 'desc' }],
};

export const useAnomalySummary = ({
  entityIds,
  entityType,
  body,
  enabled = true,
  executionContext,
}: UseAnomalySummaryParams) => {
  const { fetchAnomalySummary } = useEntityAnalyticsRoutes();

  const resolvedBody: AnomalySummaryBody = { ...DEFAULT_BODY, ...body };

  return useQuery(
    [...ANOMALY_SUMMARY_QUERY_KEY, entityType, entityIds, resolvedBody],
    ({ signal }) =>
      fetchAnomalySummary({
        entityType,
        entityIds,
        body: resolvedBody,
        signal,
        context: executionContext,
      }),
    {
      enabled: enabled && entityIds.length > 0,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 3 && (error as { response?: { status?: number } })?.response?.status !== 400,
    }
  );
};
