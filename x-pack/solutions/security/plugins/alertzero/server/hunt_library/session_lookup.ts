/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  HUNT_SESSION_TTL_SECONDS,
  type HuntSessionClaims,
} from '../../common/hunt_library_profile_state';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { MANUAL_SESSION_KIND } from './manual_session';

export type HuntSessionLookupFailure = 'not_found' | 'not_owner' | 'expired';

export type HuntSessionLookup =
  | { ok: true; claims: HuntSessionClaims; expiresAt: Date }
  | { ok: false; reason: HuntSessionLookupFailure };

/** The key the session's execution records for a user: the profile uid, else the username. */
export const readHuntUserKey = (
  user: { profile_uid?: string; username?: string } | null | undefined
): string => user?.profile_uid ?? user?.username ?? 'unknown';

/**
 * Resolves the Hunt session a Discover tab names, from the execution the launch recorded. What the
 * session is (hunt, version, Investigation) comes from that execution's labels, never from the
 * request, and only the user who started it can use it. Nothing here needs a secret: the id the
 * browser holds grants nothing by itself.
 */
export const resolveHuntSession = async ({
  management,
  request,
  spaceId,
  sessionExecutionId,
  userKey,
  now = () => Date.now(),
}: {
  management: WatchWorkflowsManagementClient;
  request: KibanaRequest;
  spaceId: string;
  sessionExecutionId: string;
  userKey: string;
  now?: () => number;
}): Promise<HuntSessionLookup> => {
  const execution = await management.getWorkflowExecution(sessionExecutionId, spaceId, request);
  const labels = execution?.labels;
  if (
    !execution ||
    execution.workflowId !== ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID ||
    labels?.['hunt.kind'] !== MANUAL_SESSION_KIND
  ) {
    return { ok: false, reason: 'not_found' };
  }
  if (execution.executedBy !== userKey) return { ok: false, reason: 'not_owner' };

  const startedAt = Date.parse(execution.startedAt);
  const definitionId = labels['hunt.definition_id'];
  const definitionVersion = Number(labels['hunt.definition_version']);
  const sessionId = labels['hunt.session_id'];
  if (
    Number.isNaN(startedAt) ||
    !definitionId ||
    !sessionId ||
    !Number.isInteger(definitionVersion)
  ) {
    return { ok: false, reason: 'not_found' };
  }

  const expiresAt = new Date(startedAt + HUNT_SESSION_TTL_SECONDS * 1000);
  if (expiresAt.getTime() <= now()) return { ok: false, reason: 'expired' };

  const investigationId = labels['hunt.investigation_id'];
  return {
    ok: true,
    expiresAt,
    claims: {
      spaceId,
      definitionId,
      definitionVersion,
      sessionId,
      sessionExecutionId,
      ...(investigationId ? { investigationId } : {}),
    },
  };
};
