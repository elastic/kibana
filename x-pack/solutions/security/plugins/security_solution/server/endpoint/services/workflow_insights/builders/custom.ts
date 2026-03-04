/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';
import moment from 'moment';

import type { BuildWorkflowInsightParams } from '.';
import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';
import {
  ActionType,
  Category,
  SourceType,
  TargetType,
} from '../../../../../common/endpoint/types/workflow_insights';

const groupSeparator = ':::';

function getMessage(insightType: DefendInsightType): string {
  switch (insightType) {
    case DefendInsightType.Enum.policy_response_failure:
      return 'Policy response failure detected';
    default:
      return 'Potential issue detected';
  }
}

export async function buildCustomWorkflowInsights({
  defendInsights,
  options,
}: BuildWorkflowInsightParams): Promise<SecurityWorkflowInsight[]> {
  const { insightType, endpointIds, connectorId, model } = options;
  const currentTime = moment();

  return defendInsights
    .filter((insight) => insight.remediation && insight.remediation.message)
    .map((insight) => {
      const displayName = insight.group.split(groupSeparator)[1];
      const workflowInsight: SecurityWorkflowInsight = {
        '@timestamp': currentTime,
        message: getMessage(insightType),
        category: Category.Endpoint,
        type: insightType,
        source: {
          type: SourceType.LlmConnector,
          id: connectorId ?? '',
          data_range_start: currentTime,
          data_range_end: currentTime,
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
            llm_model: model ?? '',
          },
          display_name: displayName,
        },
        remediation: {
          descriptive: (insight.remediation?.message as string) ?? '',
          link: (insight.remediation?.link as string) ?? '',
        },
      };

      return workflowInsight;
    });
}
