/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NIGHTSHIFT_BOUND_HOOK_TARGETS } from '@kbn/workflows/managed';
import {
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
} from '@kbn/workflows/managed';

export type BoundHookId = keyof typeof NIGHTSHIFT_BOUND_HOOK_TARGETS;

/**
 * Every workflow a space binds to the agent service account, in install order. The entry point
 * comes last: it is what marks the space as set up, so a setup that fails part-way leaves the
 * space reading as not set up rather than half working.
 */
export const BOUND_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
] as const;

export type BoundWorkflowId = (typeof BOUND_WORKFLOW_IDS)[number];
