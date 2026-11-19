/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowInsightType } from '../../../../common/endpoint/types/workflow_insights';

export const generatePrompt = (insightType: WorkflowInsightType, endpointId: string): string => {
  switch (insightType) {
    case WorkflowInsightType.enum.incompatible_antivirus:
      return `Identify third-party antivirus software on endpoint ${endpointId} that may conflict with Elastic Defend.`;
    case WorkflowInsightType.enum.policy_response_failure:
      return `Investigate Elastic Defend policy response warnings and failures on endpoint ${endpointId} and suggest remediation.`;
    case WorkflowInsightType.enum.custom:
      return `Investigate Elastic Defend configuration issues on endpoint ${endpointId} and suggest remediation.`;
    default:
      return `Run automatic troubleshooting for ${insightType} on endpoint ${endpointId}.`;
  }
};
