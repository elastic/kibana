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
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

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
  const defendInsightsPolicyResponseFailureEnabled = useIsExperimentalFeatureEnabled(
    'defendInsightsPolicyResponseFailure'
  );

  return useQuery<
    DefendInsightsResponse | undefined,
    { body?: { error: string } },
    DefendInsightsResponse | undefined
  >(
    [`fetchOngoingTasks-${endpointId}`, defendInsightsPolicyResponseFailureEnabled],
    async () => {
      try {
        const makeSingleQuery = async (): Promise<DefendInsightsResponse[]> => {
          const response = await http.get<{ data: DefendInsightsResponse[] }>(DEFEND_INSIGHTS, {
            version: API_VERSIONS.internal.v1,
            query: {
              endpoint_ids: [endpointId],
              size: 1,
            },
          });
          return response.data;
        };

        const makeMultiTypeQueries = async (): Promise<DefendInsightsResponse[]> => {
          const insightTypes = ['incompatible_antivirus', 'policy_response_failure'];

          const queries = insightTypes.map((type) =>
            http.get<{ data: DefendInsightsResponse[] }>(DEFEND_INSIGHTS, {
              version: API_VERSIONS.internal.v1,
              query: {
                endpoint_ids: [endpointId],
                size: 1,
                type, // Query for specific insight type
              },
            })
          );

          const results = await Promise.allSettled(queries);

          return results
            .filter(
              (result): result is PromiseFulfilledResult<{ data: DefendInsightsResponse[] }> =>
                result.status === 'fulfilled'
            )
            .flatMap((result) => result.value.data);
        };

        const fetchInsights = defendInsightsPolicyResponseFailureEnabled
          ? makeMultiTypeQueries
          : makeSingleQuery;

        const insights = await fetchInsights();

        const processQueryResults = (insightResults: DefendInsightsResponse[]) => {
          if (!insightResults.length) {
            // no previous scan record - treat as 0 expected insights
            onSuccess(0);
            return undefined;
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

          if (!hasRunningInsight && !hasFailedInsight) {
            onSuccess(expectedCount);
          }

          return insightResults[0];
        };

        return processQueryResults(insights);
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
