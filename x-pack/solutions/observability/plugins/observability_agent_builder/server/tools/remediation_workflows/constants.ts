/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Display `name:` in demo-environment/remediation-workflows YAML — must match exactly after sync. */
export const REMEDIATION_WORKFLOW_STANDARD_COORDINATION_NAME =
  'Incident Remediation — Standard Coordination' as const;

/** Text search fragment passed to workflows list API (exact match applied afterward). */
export const REMEDIATION_WORKFLOW_STANDARD_COORDINATION_QUERY = 'Incident Remediation' as const;

export const getRemediationWorkflowTarget = (): {
  exactWorkflowName: string;
  searchQuery: string;
  displayLabel: string;
} => ({
  exactWorkflowName: REMEDIATION_WORKFLOW_STANDARD_COORDINATION_NAME,
  searchQuery: REMEDIATION_WORKFLOW_STANDARD_COORDINATION_QUERY,
  displayLabel: 'Incident remediation — standard coordination',
});

export const OBSERVABILITY_REMEDIATION_WORKFLOW_TOOL_ID =
  'observability.remediation_workflow' as const;
