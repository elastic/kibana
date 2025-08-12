/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { WORKFLOW_INSIGHTS } from '../../translations';
import type { SecurityWorkflowInsight } from '../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';

interface UseFetchInsightsConfig {
  endpointId: string;
  onSuccess: () => void;
  scanCompleted: boolean;
  expectedCount: number | null;
}

const MAX_RETRIES = 5;

export const useFetchInsights = ({
  endpointId,
  onSuccess,
  scanCompleted,
  expectedCount,
}: UseFetchInsightsConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  return useQuery<SecurityWorkflowInsight[], Error, SecurityWorkflowInsight[]>(
    [`fetchInsights-${endpointId}`, expectedCount],
    async () => {
      if (!expectedCount) {
        if (expectedCount === 0) {
          onSuccess();
        }
        return [];
      }

      try {
        const result = await http.get<SecurityWorkflowInsight[]>(WORKFLOW_INSIGHTS_ROUTE, {
          version: API_VERSIONS.internal.v1,
          query: {
            targetIds: JSON.stringify([endpointId]),
            size: 100,
          },
        });
        if (result.length === expectedCount) {
          onSuccess();
        }
        return result;
      } catch (error) {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.fetchInsightsError,
          text: error?.message,
        });
        return [];
      }
    },
    {
      refetchOnWindowFocus: false, // We need full control over when to refetch
      enabled: !scanCompleted,
      refetchInterval: (data) => {
        if (!!expectedCount && data?.length !== expectedCount) {
          return 2000;
        }

        return false;
      },
      retry: (failureCount, error) => {
        if (failureCount >= MAX_RETRIES) {
          toasts.addDanger({
            title: WORKFLOW_INSIGHTS.toasts.maxFetchAttemptsReached,
            text: error?.message,
          });
          return false;
        }

        return true;
      },
      retryDelay: 1000,
    }
  );
};
