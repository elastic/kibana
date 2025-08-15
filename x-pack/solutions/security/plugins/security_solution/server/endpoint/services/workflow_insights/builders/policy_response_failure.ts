/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { BuildWorkflowInsightParams } from '.';
import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';
import {
  ActionType,
  Category,
  SourceType,
  TargetType,
} from '../../../../../common/endpoint/types/workflow_insights';

export async function buildPolicyResponseFailureWorkflowInsights({
  defendInsights,
  request,
}: BuildWorkflowInsightParams): Promise<SecurityWorkflowInsight[]> {
  const { insightType, endpointIds, apiConfig } = request.body;
  const currentTime = moment();

  return defendInsights
    .filter((insight) => insight.remediation && insight.remediation.message)
    .map((insight) => {
      const workflowInsight: SecurityWorkflowInsight = {
        '@timestamp': currentTime,
        message: '',
        category: Category.Endpoint,
        type: insightType,
        source: {
          type: SourceType.LlmConnector,
          id: apiConfig.connectorId,
          data_range_start: currentTime,
          data_range_end: currentTime.clone().add(24, 'hours'),
        },
        target: {
          type: TargetType.Endpoint,
          ids: endpointIds,
        },
        action: {
          type: ActionType.Refreshed,
          timestamp: currentTime,
        },
        value: insight.group,
        metadata: {
          notes: {
            llm_model: apiConfig.model ?? '',
          },
          display_name: insight.group,
        },
        remediation: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          descriptive: insight.remediation!.message as string,
        },
      };

      return workflowInsight;
    });
}
