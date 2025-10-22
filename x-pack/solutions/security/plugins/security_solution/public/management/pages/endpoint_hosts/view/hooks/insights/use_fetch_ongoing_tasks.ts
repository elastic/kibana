/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefendInsightsResponse, DefendInsightType } from '@kbn/elastic-assistant-common';
import type { Moment } from 'moment';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import {
  API_VERSIONS,
  DEFEND_INSIGHTS,
  DefendInsightStatusEnum,
} from '@kbn/elastic-assistant-common';

import { WORKFLOW_INSIGHTS } from '../../translations';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';

interface UseFetchOngoingScansConfig {
  isPolling: boolean;
  endpointId: string;
  insightTypes: DefendInsightType[];
  onSuccess: (expectedCount: number, timestamp: Moment | null) => void;
  onInsightGenerationFailure: () => void;
}

export const useFetchLatestScan = ({
  isPolling,
  endpointId,
  insightTypes,
  onSuccess,
  onInsightGenerationFailure,
}: UseFetchOngoingScansConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  return useQuery<{ hasRunning: boolean }, { body?: { error: string } }, { hasRunning: boolean }>(
    [`fetchOngoingTasks-${endpointId}`, insightTypes.length],
    async ({ signal }) => {
      try {
        const response = await http.get<{ data: DefendInsightsResponse[] }>(DEFEND_INSIGHTS, {
          version: API_VERSIONS.internal.v1,
          query: {
            endpoint_ids: [endpointId],
            size: insightTypes.length,
          },
          signal,
        });
        const timestampStr = response.data[response.data.length - 1]?.timestamp;
        const timestamp = timestampStr ? moment(timestampStr) : null;

        // we only want latest for each type
        const insightsMap = response.data.reduce((acc, curr) => {
          if (!acc[curr.insightType]) {
            acc[curr.insightType] = curr;
          }

          return acc;
        }, {} as Record<DefendInsightType, DefendInsightsResponse>);
        const insights = Object.values(insightsMap);

        const processQueryResults = (insightResults: DefendInsightsResponse[]) => {
          if (!insightResults.length) {
            // no previous scan record - treat as 0 expected insights
            onSuccess(0, null);
            return { hasRunning: false };
          }

          const expectedCount = insightResults.reduce(
            (total, defendInsight) =>
              total +
              defendInsight.insights.reduce((acc, insight) => {
                if (!insight.events) return acc;
                return acc + insight.events.length;
              }, 0),
            0
          );

          const hasRunningInsight = insightResults.some(
            (insight) => insight.status === DefendInsightStatusEnum.running
          );

          const hasFailedInsight = insightResults.some(
            (insight) => insight.status === DefendInsightStatusEnum.failed
          );

          if (hasFailedInsight) {
            const failureReasons = insightResults
              .filter((insight) => insight.status === DefendInsightStatusEnum.failed)
              .map((insight) => insight.failureReason)
              .filter(Boolean);

            toasts.addDanger({
              title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
              text: failureReasons.join('; '),
            });
            onInsightGenerationFailure();
          }

          if (!hasRunningInsight) {
            onSuccess(expectedCount, timestamp);
          }

          return { hasRunning: hasRunningInsight };
        };

        return processQueryResults(insights);
      } catch (error) {
        if (error.name !== 'AbortError') {
          toasts.addDanger({
            title: WORKFLOW_INSIGHTS.toasts.fetchPendingInsightsError,
            text: error?.body?.error,
          });
        }
        return { hasRunning: false };
      }
    },
    {
      refetchOnWindowFocus: false,
      refetchInterval: isPolling ? 2000 : false,
    }
  );
};
