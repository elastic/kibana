/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { HuntHistoryEntry } from '../../common/hunt_library';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { MANUAL_SESSION_KIND } from './manual_session';

/** The newest sessions shown per hunt; older ones stay in Workflows until retention removes them. */
export const HUNT_HISTORY_LIMIT = 50;

const DEFAULT_OUTCOME = 'exploratory';

/**
 * A hunt's manual run history, newest first. Executions are found by the `hunt.definition_id`
 * label and grouped by `hunt.session_id`, so a retried launch shows once. A session whose outcome
 * label was never written reads as exploratory.
 */
export const listHuntHistory = async ({
  client,
  request,
  spaceId,
  definitionId,
}: {
  client: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  spaceId: string;
  definitionId: string;
}): Promise<HuntHistoryEntry[]> => {
  const executions = await client.findExecutionsByLabel({
    workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
    key: 'hunt.definition_id',
    value: definitionId,
    spaceId,
    request,
    size: HUNT_HISTORY_LIMIT,
  });

  const bySession = new Map<string, HuntHistoryEntry>();
  for (const execution of executions) {
    const { labels } = execution;
    const sessionId = labels?.['hunt.session_id'];
    if (labels?.['hunt.kind'] !== MANUAL_SESSION_KIND || !sessionId) continue;
    if (bySession.has(sessionId)) continue;
    bySession.set(sessionId, {
      kind: 'manual_session',
      sessionId,
      executionId: execution.id,
      definitionVersion: Number(labels['hunt.definition_version']) || 0,
      outcome: labels['hunt.outcome'] ?? DEFAULT_OUTCOME,
      startedAt: execution.startedAt,
      ...(execution.executedBy ? { startedBy: execution.executedBy } : {}),
    });
  }
  return [...bySession.values()];
};
