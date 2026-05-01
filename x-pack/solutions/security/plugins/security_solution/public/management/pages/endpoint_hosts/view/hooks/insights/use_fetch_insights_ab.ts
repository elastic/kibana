/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import {
  WorkflowInsightActionType,
  type WorkflowInsightType,
  type SecurityWorkflowInsight,
} from '../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../translations';

interface UseFetchInsightsABConfig {
  endpointId: string;
  scanTimestamp: number;
  insightTypes: WorkflowInsightType[];
}

export const useFetchInsightsAB = ({
  endpointId,
  scanTimestamp,
  insightTypes,
}: UseFetchInsightsABConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  // Use scanTimestamp in key to avoid stale cache collisions on remount
  return useQuery<SecurityWorkflowInsight[], Error, SecurityWorkflowInsight[]>(
    [`fetchInsights-ab-${endpointId}`, scanTimestamp],
    async ({ signal }) => {
      try {
        return await http.get<SecurityWorkflowInsight[]>(WORKFLOW_INSIGHTS_ROUTE, {
          version: '1',
          query: {
            targetIds: JSON.stringify([endpointId]),
            types: JSON.stringify(insightTypes),
            actionTypes: JSON.stringify([WorkflowInsightActionType.enum.refreshed]),
            size: 100,
          },
          signal,
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          return [];
        }
        throw error;
      }
    },
    {
      refetchOnWindowFocus: false,
      // Always fetch on mount to display previous scan results.
      // The scanTimestamp in the query key ensures a fresh fetch after each new scan.
      onError: (error) => {
        if ((error as Error & { name?: string }).name !== 'AbortError') {
          toasts.addDanger({
            title: WORKFLOW_INSIGHTS.toasts.fetchInsightsError,
            text: (error as Error).message ?? WORKFLOW_INSIGHTS.toasts.unexpectedError,
          });
        }
      },
    }
  );
};
