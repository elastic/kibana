/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
  NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

const ALWAYS_INSTALLED_WORKFLOW_IDS = [
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID,
  NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
] as const;
const WIKI_OR_MEMORY_WORKFLOW_IDS = [
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
] as const;
const DECISION_TREE_WORKFLOW_IDS = [NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID] as const;

/**
 * Installs the global, unbound workflows this plugin owns in one batch, then signals readiness so
 * the platform can reconcile them. The investigation runs through each space's bound entry point
 * and inherits its service account from it, so a code change updates this one copy. Throws
 * without calling `ready()` when any workflow failed to install, so persisted ones are kept.
 */
export const installStaticWorkflows = async ({
  client,
  wikiOrMemoryEnabled,
  decisionTreesEnabled,
}: {
  client: PluginScopedManagedWorkflowsApi;
  wikiOrMemoryEnabled: boolean;
  decisionTreesEnabled: boolean;
}): Promise<void> => {
  const ids = [
    ...ALWAYS_INSTALLED_WORKFLOW_IDS,
    ...(wikiOrMemoryEnabled ? WIKI_OR_MEMORY_WORKFLOW_IDS : []),
    ...(decisionTreesEnabled ? DECISION_TREE_WORKFLOW_IDS : []),
  ];

  const { failed } = await client.installMany(
    ids.map((id) => ({ id, spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
  );
  if (failed.length > 0) {
    throw new Error(failed.map(({ id, error }) => `"${id}": ${error.message}`).join('; '));
  }

  await client.ready();
};
