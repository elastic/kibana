/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { DefendInsightsResponse } from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  DEFEND_INSIGHTS,
  DefendInsightTypeEnum,
} from '@kbn/elastic-assistant-common';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../translations';

interface UseTriggerScanPayload {
  endpointId: string;
  connectorId: string;
  actionTypeId: string;
}

interface UseTriggerScanConfig {
  onMutate: () => void;
  onSuccess: () => void;
}

export const useTriggerScan = ({ onMutate, onSuccess }: UseTriggerScanConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  return useMutation<DefendInsightsResponse, { body?: { error: string } }, UseTriggerScanPayload>(
    ({ endpointId, connectorId, actionTypeId }: UseTriggerScanPayload) =>
      http.post<DefendInsightsResponse>(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          endpointIds: [endpointId],
          insightType: DefendInsightTypeEnum.incompatible_antivirus,
          anonymizationFields: anonymizationFields.data,
          replacements: {},
          subAction: 'invokeAI',
          apiConfig: {
            connectorId,
            actionTypeId,
          },
        }),
      }),
    {
      onMutate,
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
