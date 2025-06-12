/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import {
  API_VERSIONS,
  DEFEND_INSIGHTS,
  type DefendInsightsResponse,
  DefendInsightStatusEnum,
} from '@kbn/elastic-assistant-common';
import { WORKFLOW_INSIGHTS } from '../../translations';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';

interface UseFetchOngoingScansConfig {
  isPolling: boolean;
  endpointId: string;
  onSuccess: (expectedCount: number) => void;
  onInsightGenerationFailure: () => void;
}

export const useFetchLatestScan = ({
  isPolling,
  endpointId,
  onSuccess,
  onInsightGenerationFailure,
}: UseFetchOngoingScansConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  return useQuery<
    DefendInsightsResponse | undefined,
    { body?: { error: string } },
    DefendInsightsResponse | undefined
  >(
    [`fetchOngoingTasks-${endpointId}`],
    async () => {
      try {
        const response = await http.get<{ data: DefendInsightsResponse[] }>(DEFEND_INSIGHTS, {
          version: API_VERSIONS.internal.v1,
          query: {
            endpoint_ids: [endpointId],
            size: 1,
          },
        });

        const defendInsight = response.data[0];
        if (!defendInsight) {
          // no previous scan record - treat as 0 expected insights
          onSuccess(0);
          return undefined;
        }

        const status = defendInsight.status;

        if (status === DefendInsightStatusEnum.failed) {
          toasts.addDanger({
            title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
            text: defendInsight.failureReason,
          });
          onInsightGenerationFailure();
        }

        if (status === DefendInsightStatusEnum.succeeded) {
          const expectedCount = defendInsight.insights.reduce((acc, insight) => {
            if (!insight.events) {
              return acc;
            }
            return acc + insight.events.length;
          }, 0);
          onSuccess(expectedCount);
        }

        return defendInsight;
      } catch (error) {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
          text: error?.body?.error,
        });
        return undefined;
      }
    },
    {
      refetchOnWindowFocus: false,
      refetchInterval: isPolling ? 2000 : false,
    }
  );
};
