/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { CreateWorkflowInsightResponse } from '../../../../../../../common/api/endpoint/workflow_insights/workflow_insights';
import type { WorkflowInsightType } from '../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../translations';

interface UseTriggerScanABConfig {
  onSuccess: (data: {
    executions: CreateWorkflowInsightResponse['executions'];
    failures: CreateWorkflowInsightResponse['failures'];
  }) => void;
  onError: () => void;
}

interface TriggerScanABPayload {
  endpointId: string;
  insightTypes: WorkflowInsightType[];
  connectorId: string;
}

export const useTriggerScanAB = ({ onSuccess, onError }: UseTriggerScanABConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  return useMutation<
    CreateWorkflowInsightResponse,
    { body?: { error: string; message?: string } },
    TriggerScanABPayload
  >(
    async ({ endpointId, insightTypes, connectorId }: TriggerScanABPayload) => {
      return http.post<CreateWorkflowInsightResponse>(WORKFLOW_INSIGHTS_ROUTE, {
        version: '1',
        body: JSON.stringify({
          insightTypes,
          endpointIds: [endpointId],
          connectorId,
        }),
      });
    },
    {
      onSuccess: (data) => {
        onSuccess({ executions: data.executions, failures: data.failures });
      },
      onError: (err) => {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.scanError,
          text: err.body?.message ?? err.body?.error ?? WORKFLOW_INSIGHTS.toasts.unexpectedError,
        });
        onError();
      },
    }
  );
};
