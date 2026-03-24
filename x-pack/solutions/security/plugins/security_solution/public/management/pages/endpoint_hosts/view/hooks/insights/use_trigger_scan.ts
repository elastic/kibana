/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { DefendInsightsResponse, DefendInsightType } from '@kbn/elastic-assistant-common';
import { API_VERSIONS, DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../translations';

interface UseTriggerScanPayload {
  endpointId: string;
  connectorId: string;
  actionTypeId: string;
  insightTypes: DefendInsightType[];
}

interface UseTriggerScanConfig {
  onSuccess: () => void;
}

export const useTriggerScan = ({ onSuccess }: UseTriggerScanConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  return useMutation<DefendInsightsResponse[], { body?: { error: string } }, UseTriggerScanPayload>(
    async ({ endpointId, connectorId, actionTypeId, insightTypes }: UseTriggerScanPayload) => {
      if (insightTypes.length === 0) {
        return [];
      }

      const scanPromises = insightTypes.map((insightType) =>
        http.post<DefendInsightsResponse>(DEFEND_INSIGHTS, {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({
            endpointIds: [endpointId],
            insightType,
            anonymizationFields: anonymizationFields.data,
            replacements: {},
            subAction: 'invokeAI',
            apiConfig: {
              connectorId,
              actionTypeId,
            },
          }),
        })
      );

      const results = await Promise.allSettled(scanPromises);

      const fulfilledResults = results
        .filter(
          (result): result is PromiseFulfilledResult<DefendInsightsResponse> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value);

      const rejectedResults = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );

      if (rejectedResults.length > 0) {
        rejectedResults.forEach(() => {
          toasts.addWarning({
            title: WORKFLOW_INSIGHTS.toasts.partialScanError,
            text: WORKFLOW_INSIGHTS.toasts.partialScanErrorBody,
          });
        });
      }

      return fulfilledResults;
    },
    {
      onSuccess,
      onError: (err) => {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.scanError,
          text: err.body?.error,
        });
      },
    }
  );
};
