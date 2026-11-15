/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { v5 as uuidv5 } from 'uuid';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { HUNT_LABEL_OWNER_ID } from './execution_labels';
import type { HuntDefinition } from './hunt_definition';

/**
 * Fixed namespace UUID for manual session execution ids. Arbitrary but frozen: changing it moves
 * every session to a new execution id, so a retried launch would create a second execution.
 */
const MANUAL_SESSION_UUID_NAMESPACE = 'b3c1f7d4-5a0e-5c8b-8f21-9d6e4a7c1e02';

export const MANUAL_SESSION_KIND = 'manual_session' as const;
export const MANUAL_SESSION_TRIGGER = 'library_launch' as const;
export const MANUAL_SESSION_OUTCOME_EXPLORATORY = 'exploratory' as const;

/** Labels that identify a session and never change once it exists. */
export const MANUAL_SESSION_IMMUTABLE_LABEL_KEYS = [
  'hunt.kind',
  'hunt.definition_id',
  'hunt.definition_version',
  'hunt.session_id',
  'hunt.trigger',
] as const;

/** A `session_id` already belongs to a different hunt definition or version. */
export class HuntSessionConflictError extends Error {
  constructor() {
    super('This session id was already used for a different hunt');
    this.name = 'HuntSessionConflictError';
  }
}

/** One execution per (space, definition, version, session): a retried launch finds the same one. */
export const deriveManualSessionExecutionId = ({
  spaceId,
  definitionId,
  definitionVersion,
  sessionId,
}: {
  spaceId: string;
  definitionId: string;
  definitionVersion: number;
  sessionId: string;
}): string =>
  uuidv5(
    `hunt:manual_session:${spaceId}|${definitionId}|${definitionVersion}|${sessionId}`,
    MANUAL_SESSION_UUID_NAMESPACE
  );

export const buildManualSessionIdentityLabels = ({
  definition,
  sessionId,
}: {
  definition: Pick<HuntDefinition, 'id' | 'version'>;
  sessionId: string;
}): Record<string, string> => ({
  'hunt.kind': MANUAL_SESSION_KIND,
  'hunt.definition_id': definition.id,
  'hunt.definition_version': String(definition.version),
  'hunt.session_id': sessionId,
  'hunt.trigger': MANUAL_SESSION_TRIGGER,
});

export interface LaunchManualSessionResult {
  sessionId: string;
  executionId: string;
  /** True when this launch was a retry of one that already created the execution. */
  reusedExisting: boolean;
}

/**
 * Records one analyst hunt session as a short managed workflow execution so it appears in run
 * history. Retrying with the same `sessionId` reuses the execution. Nothing about the analyst's
 * Discover work is stored, and no Investigation is created.
 */
export const launchManualSession = async ({
  client,
  request,
  spaceId,
  definition,
  sessionId,
  logger,
}: {
  client: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  spaceId: string;
  definition: HuntDefinition;
  sessionId: string;
  logger: Logger;
}): Promise<LaunchManualSessionResult> => {
  const workflowId = ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID;

  const existing = await client.findExecutionsByLabel({
    workflowId,
    key: 'hunt.session_id',
    value: sessionId,
    spaceId,
    request,
  });
  const belongsElsewhere = existing.some(
    ({ labels }) =>
      labels?.['hunt.definition_id'] !== definition.id ||
      labels?.['hunt.definition_version'] !== String(definition.version)
  );
  if (belongsElsewhere) throw new HuntSessionConflictError();

  const executionId = deriveManualSessionExecutionId({
    spaceId,
    definitionId: definition.id,
    definitionVersion: definition.version,
    sessionId,
  });
  const { reusedExisting } = await client.executeLabeledWorkflow({
    workflowId,
    spaceId,
    request,
    executionId,
    inputs: {
      definitionId: definition.id,
      definitionVersion: definition.version,
      sessionId,
    },
    labels: buildManualSessionIdentityLabels({ definition, sessionId }),
    labelOwnerId: HUNT_LABEL_OWNER_ID,
  });

  if (!reusedExisting) {
    try {
      await client.updateExecutionLabels({
        executionId,
        spaceId,
        workflowId,
        labelOwnerId: HUNT_LABEL_OWNER_ID,
        labels: { 'hunt.outcome': MANUAL_SESSION_OUTCOME_EXPLORATORY },
        immutableKeys: MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
      });
    } catch (err) {
      // History reads a session with no outcome as exploratory, so the launch still stands.
      logger.warn(
        `Hunt session ${sessionId} started but its outcome label was not written: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return { sessionId, executionId, reusedExisting };
};
