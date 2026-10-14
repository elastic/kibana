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
import type { EntityViewMode } from '../../../../common/entity_analytics/entity_store/resolution_group';
import { useEntityAnalyticsRoutes } from '../api';

export const ANOMALY_SUMMARY_QUERY_KEY = ['POST', 'FETCH_ANOMALY_SUMMARY'] as const;

interface UseAnomalySummaryParams {
  entityId: string;
  entityType: string;
  /**
   * `single` (default) covers `entityId` only; `resolved` makes the server include the whole
   * resolution group (the target plus every entity resolved to it).
   */
  mode?: EntityViewMode;
  body?: Omit<GetAnomalySummaryRequestBodyInput, 'mode'>;
  enabled?: boolean;
  /**
   * Optional Kibana execution context forwarded to the anomaly-summary fetch so slow logs and
   * APM traces can attribute the query to the calling page/panel.
   */
  executionContext?: KibanaExecutionContext;
}

type AnomalySummaryBody = AnomalySummaryRequestBody;

const DEFAULT_BODY: Required<Pick<AnomalySummaryBody, 'page' | 'page_size' | 'sort'>> = {
  page: 1,
  page_size: 10,
  sort: [{ field: 'timestamp', order: 'desc' }],
};

export const useAnomalySummary = ({
  entityId,
  entityType,
  mode,
  body,
  enabled = true,
  executionContext,
}: UseAnomalySummaryParams) => {
  const { fetchAnomalySummary } = useEntityAnalyticsRoutes();

  // Only the non-default mode is sent, so single-entity requests keep their original shape.
  const resolvedBody: AnomalySummaryBody = {
    ...DEFAULT_BODY,
    ...body,
    ...(mode === 'resolved' ? { mode } : {}),
  };

  return useQuery(
    [...ANOMALY_SUMMARY_QUERY_KEY, entityType, entityId, resolvedBody],
    ({ signal }) =>
      fetchAnomalySummary({
        entityType,
        entityId,
        body: resolvedBody,
        signal,
        context: executionContext,
      }),
    {
      enabled: enabled && !!entityId,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 3 && (error as { response?: { status?: number } })?.response?.status !== 400,
    }
  );
};
