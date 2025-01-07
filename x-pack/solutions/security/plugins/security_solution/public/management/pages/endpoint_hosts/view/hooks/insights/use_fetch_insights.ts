/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION } from '@kbn/elastic-assistant-common';
import { WORKFLOW_INSIGHTS } from '../../translations';
import type { SecurityWorkflowInsight } from '../../../../../../../common/endpoint/types/workflow_insights';
import { ActionType } from '../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';

interface UseFetchInsightsConfig {
  endpointId: string;
  onSuccess: () => void;
}

export const useFetchInsights = ({ endpointId, onSuccess }: UseFetchInsightsConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  return useQuery<SecurityWorkflowInsight[], Error, SecurityWorkflowInsight[]>(
    [`fetchInsights-${endpointId}`],
    async () => {
      try {
        const result = await http.get<SecurityWorkflowInsight[]>(WORKFLOW_INSIGHTS_ROUTE, {
          version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
          query: {
            actionTypes: JSON.stringify([ActionType.Refreshed]),
            targetIds: JSON.stringify([endpointId]),
          },
        });
        onSuccess();
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
    }
  );
};
