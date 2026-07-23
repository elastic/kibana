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
  WorkflowInsightType,
  WorkflowInsightActionType,
  WorkflowInsightCategory,
  WorkflowInsightSourceType,
  WorkflowInsightTargetType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { toExternalDocLink } from '../../../../../common/endpoint/utils/external_doc_link';

const groupSeparator = ':::';

function getMessage(insightType: WorkflowInsightType): string {
  switch (insightType) {
    case WorkflowInsightType.enum.policy_response_failure:
      return 'Policy response failure detected';
    default:
      return 'Potential issue detected';
  }
}

function getPolicyResponseFailureDisplayName(group: string): string | undefined {
  const [actionName, actionMessage] = group.split(groupSeparator);

  if (actionName && actionMessage) {
    return `${actionName}: ${actionMessage}`;
  }

  return actionMessage || actionName || undefined;
}

function getDisplayName(insightType: WorkflowInsightType, group: string): string | undefined {
  if (insightType === WorkflowInsightType.enum.policy_response_failure) {
    return getPolicyResponseFailureDisplayName(group);
  }

  return group.split(groupSeparator)[1];
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
      const displayName = getDisplayName(insightType, insight.group);
      const workflowInsight: SecurityWorkflowInsight = {
        '@timestamp': currentTime,
        message: getMessage(insightType),
        category: WorkflowInsightCategory.enum.endpoint,
        type: insightType,
        source: {
          type: WorkflowInsightSourceType.enum['llm-connector'],
          id: connectorId ?? '',
          data_range_start: currentTime,
          data_range_end: currentTime,
        },
        target: {
          type: WorkflowInsightTargetType.enum.endpoint,
          ids: endpointIds,
        },
        action: {
          type: WorkflowInsightActionType.enum.refreshed,
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
          link: toExternalDocLink(insight.remediation?.link),
        },
      };

      return workflowInsight;
    });
}
