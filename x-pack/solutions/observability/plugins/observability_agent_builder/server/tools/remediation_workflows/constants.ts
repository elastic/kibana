/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Display `name:` in demo-environment/remediation-workflows YAML — must match exactly after sync. */
export const REMEDIATION_WORKFLOW_K8S_ROLLBACK_NAME =
  'Kubernetes Service Rollback — Emergency Remediation' as const;

export const REMEDIATION_WORKFLOW_CIRCUIT_BREAKER_NAME =
  'Service Circuit Breaker — Emergency Traffic Isolation' as const;

export const REMEDIATION_WORKFLOW_SERVICE_SCALING_NAME =
  'Service Resource Scaling — Emergency Pod & Limit Adjustment' as const;

/** Text search fragment passed to workflows list API (exact match applied afterward). */
export const REMEDIATION_WORKFLOW_K8S_ROLLBACK_QUERY = 'Kubernetes Service Rollback' as const;

export const REMEDIATION_WORKFLOW_CIRCUIT_BREAKER_QUERY = 'Service Circuit Breaker' as const;

export const REMEDIATION_WORKFLOW_SERVICE_SCALING_QUERY = 'Service Resource Scaling' as const;

export const REMEDIATION_WORKFLOW_TYPES = [
  'k8s_rollback',
  'circuit_breaker',
  'service_scaling',
] as const;

export type RemediationWorkflowType = (typeof REMEDIATION_WORKFLOW_TYPES)[number];

export const getRemediationWorkflowTarget = (
  workflowType: RemediationWorkflowType
): { exactWorkflowName: string; searchQuery: string; displayLabel: string } => {
  switch (workflowType) {
    case 'k8s_rollback':
      return {
        exactWorkflowName: REMEDIATION_WORKFLOW_K8S_ROLLBACK_NAME,
        searchQuery: REMEDIATION_WORKFLOW_K8S_ROLLBACK_QUERY,
        displayLabel: 'Kubernetes rollback (emergency)',
      };
    case 'circuit_breaker':
      return {
        exactWorkflowName: REMEDIATION_WORKFLOW_CIRCUIT_BREAKER_NAME,
        searchQuery: REMEDIATION_WORKFLOW_CIRCUIT_BREAKER_QUERY,
        displayLabel: 'Circuit breaker / traffic isolation',
      };
    case 'service_scaling':
      return {
        exactWorkflowName: REMEDIATION_WORKFLOW_SERVICE_SCALING_NAME,
        searchQuery: REMEDIATION_WORKFLOW_SERVICE_SCALING_QUERY,
        displayLabel: 'Service scaling / resource limits',
      };
  }
};

export const OBSERVABILITY_REMEDIATION_WORKFLOW_TOOL_ID =
  'observability.remediation_workflow' as const;
