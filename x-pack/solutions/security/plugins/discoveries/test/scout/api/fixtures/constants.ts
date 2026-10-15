/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'Content-Type': 'application/json;charset=UTF-8',
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

/**
 * Feature flag that gates the AD 2.0 internal API surface (`_generate`,
 * schedules, execution monitoring). All internal routes fall through to a
 * `404 Not Found` (via `assertWorkflowsEnabled`) when it is OFF, so the suite
 * must enable it at runtime before exercising those routes.
 */
export const ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled';

/**
 * Internal execution-monitoring routes for AD 2.0.
 *
 * These require attack discovery + alerts read + workflows READ (but NOT
 * execute) at the route-authz layer, so a caller that can read workflows may
 * monitor executions without being able to trigger them.
 */
export const MONITORING_ROUTES = {
  EXECUTION_TRACKING: (executionId: string) =>
    `internal/attack_discovery/executions/${executionId}/tracking`,
  PIPELINE_DATA: (workflowId: string, executionId: string) =>
    `internal/attack_discovery/workflow/${workflowId}/execution/${executionId}`,
} as const;

export const SCHEDULE_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

/**
 * Per-space Advanced Setting that, together with the feature flag above, gates the AD 2.0 internal
 * routes. Defined in `@kbn/security-solution-navigation`; inlined to avoid a cross-boundary import.
 */
export const ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING =
  'securitySolution:enableAttackDiscoveryWorkflows';
