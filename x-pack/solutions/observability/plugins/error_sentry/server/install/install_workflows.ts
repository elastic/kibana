/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
  ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
  ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
} from '../../common/constants';

export const ALL_WORKFLOW_IDS = [
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_ESCALATE_GITHUB_WORKFLOW_ID,
  ERROR_SENTRY_ASK_RALPH_WORKFLOW_ID,
  ERROR_SENTRY_INTROSPECT_WORKFLOW_ID,
  ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
] as const;

export const installWorkflow = async (
  managedClient: PluginScopedManagedWorkflowsApi,
  workflowId: (typeof ALL_WORKFLOW_IDS)[number]
): Promise<void> => {
  await managedClient.install(workflowId, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
};

export const installAllWorkflows = async (
  managedClient: PluginScopedManagedWorkflowsApi
): Promise<void> => {
  await Promise.all(ALL_WORKFLOW_IDS.map((id) => installWorkflow(managedClient, id)));
};
