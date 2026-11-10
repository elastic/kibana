/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

/**
 * Installs the scoring workflow globally, unbound. The investigation workflow starts it with its
 * own identity, so it needs no per-space copy, and its score step does nothing where the evals
 * plugin isn't loaded or scoring is paused.
 */
export const installOnlineEvalsWorkflow = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
  await client.install(NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID, {
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  });
};
