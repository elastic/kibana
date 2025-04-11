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
import { useEffect, useRef } from 'react';
import { WORKFLOW_INSIGHTS } from '../../translations';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';

interface UseFetchOngoingScansConfig {
  isPolling: boolean;
  endpointId: string;
  onSuccess: () => void;
  onInsightGenerationFailure: () => void;
}

export const useFetchOngoingScans = ({
  isPolling,
  endpointId,
  onSuccess,
  onInsightGenerationFailure,
}: UseFetchOngoingScansConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  // Ref to track if polling was active in the previous render
  const wasPolling = useRef(isPolling);

  useEffect(() => {
    // If polling was active and isPolling is false, it means the condition has been met and we can run onSuccess logic (i.e. refetch insights)
    if (wasPolling.current && !isPolling) {
      onSuccess();
    }
    wasPolling.current = isPolling;
  }, [isPolling, onSuccess]);

  return useQuery<DefendInsightsResponse[], { body?: { error: string } }, DefendInsightsResponse[]>(
    [`fetchOngoingTasks-${endpointId}`],
    async () => {
      try {
        const response = await http.get<{ data: DefendInsightsResponse[] }>(DEFEND_INSIGHTS, {
          version: API_VERSIONS.internal.v1,
          query: {
            status: DefendInsightStatusEnum.running,
            endpoint_ids: [endpointId],
          },
        });
        if (response.data.length) {
          const failedInsight = response.data.find((insight) => insight.status === 'failed');

          if (failedInsight) {
            toasts.addDanger({
              title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
              text: failedInsight.failureReason,
            });
            onInsightGenerationFailure();
          }
        }
        return response.data;
      } catch (error) {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
          text: error?.body?.error,
        });
        return [];
      }
    },
    {
      refetchOnWindowFocus: false,
      refetchInterval: isPolling ? 2000 : false,
    }
  );
};
