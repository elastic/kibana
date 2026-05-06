/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const k8sRollbackFields = {
  service_name: z
    .string()
    .min(1)
    .describe(
      'Kubernetes / APM service name to roll back (e.g. service.name from the significant event or tools).'
    ),
  namespace: z
    .string()
    .min(1)
    .describe('Kubernetes namespace where the service runs (e.g. production, default).'),
  reason: z
    .string()
    .optional()
    .describe('Short, auditable reason tied to this investigation (logged with the workflow run).'),
};

const circuitBreakerFields = {
  service_name: z.string().min(1).describe('Kubernetes service to apply circuit breaking to.'),
  namespace: z.string().min(1).describe('Kubernetes namespace the service runs in.'),
  standby_endpoint: z
    .string()
    .optional()
    .describe(
      'Optional standby hostname to reroute traffic to; omit when only ejecting unhealthy hosts.'
    ),
  consecutive_errors_threshold: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Consecutive 5xx responses before ejecting a host (workflow default if omitted).'),
  ejection_duration_seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Seconds an ejected host stays out of the pool (workflow default if omitted).'),
  reason: z.string().min(1).describe('Reason for activation — audit log and notifications.'),
};

const serviceScalingFields = {
  service_name: z
    .string()
    .min(1)
    .describe('Kubernetes Deployment (and HPA) name to scale or patch limits for.'),
  namespace: z.string().min(1).describe('Kubernetes namespace the deployment runs in.'),
  target_replica_count: z
    .number()
    .int()
    .positive()
    .describe('Desired replica count after scaling (sets HPA min and immediate scale-out).'),
  hpa_max_replicas: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('New HPA maxReplicas; use 0 to leave unchanged (workflow default).'),
  memory_limit: z
    .string()
    .optional()
    .describe('New container memory limit (e.g. 2Gi); omit to keep current.'),
  cpu_limit: z
    .string()
    .optional()
    .describe('New container CPU limit (e.g. 1000m); omit to keep current.'),
  reason: z.string().min(1).describe('Reason for the scaling action — recorded in the change log.'),
};

export const k8sRollbackRemediationToolSchema = z.object({
  workflow_type: z
    .literal('k8s_rollback')
    .describe('Bad deployment / rollout — emergency rollback.'),
  ...k8sRollbackFields,
});

export const circuitBreakerRemediationToolSchema = z.object({
  workflow_type: z
    .literal('circuit_breaker')
    .describe('Traffic isolation — Istio outlier detection / optional standby routing.'),
  ...circuitBreakerFields,
});

export const serviceScalingRemediationToolSchema = z.object({
  workflow_type: z
    .literal('service_scaling')
    .describe('Resource exhaustion — HPA / replica and limit overrides.'),
  ...serviceScalingFields,
});

export const remediationWorkflowSchema = z.discriminatedUnion('workflow_type', [
  k8sRollbackRemediationToolSchema,
  circuitBreakerRemediationToolSchema,
  serviceScalingRemediationToolSchema,
]);

export type RemediationWorkflowToolParams = z.infer<typeof remediationWorkflowSchema>;

export const remediationWorkflowToolInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Natural-language remediation request, e.g. "Rollback opbeans-go in production due to bad deploy", "Apply circuit breaker for checkout-service", "Scale cart-service to 5 replicas".'
    ),
});

export type RemediationWorkflowToolInput = z.infer<typeof remediationWorkflowToolInputSchema>;

export const omitEmptyStrings = (params: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (value === '') {
      continue;
    }
    out[key] = value;
  }
  return out;
};

export const mapRemediationParamsToWorkflowPayload = (
  params: RemediationWorkflowToolParams
): Record<string, unknown> => {
  const { workflow_type: _workflowType, ...rest } = params;
  return omitEmptyStrings(rest as Record<string, unknown>);
};
