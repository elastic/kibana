/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  type ManagedWorkflowId,
  type TemplatedManagedWorkflowId,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { GLOBAL_CORE_WORKFLOW_IDS } from '../../maintenance/managed_workflow_targets';

// Groupings come from `managed_workflow_targets.ts` so install and pause stay in sync.
// These are all non-templated workflows, so they install without template `values`.
const WORKFLOWS_TO_INSTALL: Array<{
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}> = [
  ...GLOBAL_CORE_WORKFLOW_IDS.map((workflowId) => ({
    workflowId,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  })),
  {
    workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  },
];

export const installWorkflows = async ({ client }: { client: PluginScopedManagedWorkflowsApi }) => {
  // Install every workflow independently and report all failures at once. A fail-fast Promise.all
  // would hide the other failed ids, so the caller could not tell which workflows still need a retry.
  const installs: Array<{ id: string; run: Promise<void> }> = [
    ...WORKFLOWS_TO_INSTALL.map(({ workflowId, spaceId }) => ({
      id: workflowId,
      run: client.install(workflowId, { spaceId }),
    })),
  ];

  const results = await Promise.allSettled(installs.map(({ run }) => run));

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${installs[index].id} (${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          })`,
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(`Failed to install managed workflows: [${failures.join('; ')}]`);
  }
};
