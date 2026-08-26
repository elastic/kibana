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
 * Internal schedule API routes for discoveries.
 *
 * These mirror the 7 internal routes defined in the OpenAPI schemas
 * (bead kibana-9p4.2) and implemented in bead kibana-9p4.6.
 */
export const SCHEDULE_ROUTES = {
  CREATE: 'internal/attack_discovery/schedules',
  DELETE: (id: string) => `internal/attack_discovery/schedules/${id}`,
  DISABLE: (id: string) => `internal/attack_discovery/schedules/${id}/_disable`,
  ENABLE: (id: string) => `internal/attack_discovery/schedules/${id}/_enable`,
  FIND: 'internal/attack_discovery/schedules/_find',
  GET: (id: string) => `internal/attack_discovery/schedules/${id}`,
  UPDATE: (id: string) => `internal/attack_discovery/schedules/${id}`,
} as const;

/**
 * Internal ad-hoc generation route for AD 2.0.
 *
 * Requires workflows read + execute at the route-authz layer (least-privilege
 * matrix, bead kibana-5wd6.1), so an under-privileged caller is rejected with a
 * synchronous 403.
 */
export const GENERATE_ROUTE = 'internal/attack_discovery/_generate';

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

/**
 * Public attack discovery schedule API routes in elastic_assistant.
 * Used by isolation tests to verify tag-based separation.
 */
export const PUBLIC_SCHEDULE_ROUTES = {
  CREATE: 'api/attack_discovery/schedules',
  DELETE: (id: string) => `api/attack_discovery/schedules/${id}`,
  FIND: 'api/attack_discovery/schedules/_find',
  GET: (id: string) => `api/attack_discovery/schedules/${id}`,
} as const;

export const SCHEDULE_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

/**
 * Tag used by the internal schedule API to isolate its alerting rules
 * from the public schedule API in elastic_assistant.
 */
export const INTERNAL_SCHEDULE_TAG = 'attack-discovery-schedule';
