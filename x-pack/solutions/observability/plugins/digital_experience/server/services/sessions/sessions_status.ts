/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_TASK_ID,
  SESSIONS_VERSION,
  sessionsLagThresholdSeconds,
  type SessionsHealth,
  type SessionsRunError,
  type SessionsSettings,
  type SessionsStatus,
} from '../../../common/sessions';
import type { SessionsTaskState } from './sessions_task';

const MISSING_STATUS: SessionsStatus = {
  installed: false,
  health: 'missing',
  installedVersion: null,
  currentVersion: SESSIONS_VERSION,
  rebuilding: false,
  apiKeyInvalid: false,
  lagSeconds: null,
  summarizedUntil: null,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  enabledBy: null,
  retentionDays: SESSIONS_LOOKBACK_DAYS,
};

const getTask = async (
  taskManager: TaskManagerStartContract
): Promise<ConcreteTaskInstance | undefined> => {
  try {
    return await taskManager.get(SESSIONS_TASK_ID);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

/** Health, the worst first: an unusable key, a failing run, then one that is behind. */
const healthOf = ({
  apiKeyInvalid,
  lastError,
  lagging,
}: {
  apiKeyInvalid: boolean;
  lastError: SessionsRunError | null;
  lagging: boolean;
}): SessionsHealth => {
  if (apiKeyInvalid || lastError) {
    return 'degraded';
  }
  return lagging ? 'lagging' : 'healthy';
};

/**
 * The sessions status, from the summaries task and what its last run recorded. Without Task
 * Manager, nothing can build sessions, so they're missing. Who enabled sessions and why the last
 * run failed are only told `withDetails`, to users who can set sessions up.
 */
export const getSessionsStatus = async ({
  taskManager,
  settings,
  withDetails = false,
  now = Date.now(),
}: {
  taskManager: TaskManagerStartContract | undefined;
  settings: SessionsSettings;
  withDetails?: boolean;
  now?: number;
}): Promise<SessionsStatus> => {
  const task = taskManager ? await getTask(taskManager) : undefined;
  if (!task) {
    return MISSING_STATUS;
  }
  const state: SessionsTaskState = task.state;
  const installedVersion = state.version ?? null;
  const rebuilding = state.caughtUp !== true || installedVersion !== SESSIONS_VERSION;
  const summarizedUntil = state.checkpoint ?? null;
  const lagSeconds =
    summarizedUntil === null
      ? null
      : Math.max(0, Math.round((now - Date.parse(summarizedUntil)) / 1000));
  // A rejected key that the task no longer has: sessions were enabled again since, with a new key
  // that no run has used yet, so the failure is the old key's.
  const replacedKeyFailed =
    state.apiKeyInvalid === true &&
    !!state.failedApiKeyId &&
    !!task.userScope &&
    state.failedApiKeyId !== task.userScope.apiKeyId;
  const apiKeyInvalid = !task.userScope || (state.apiKeyInvalid === true && !replacedKeyFailed);
  const recordedError = replacedKeyFailed ? null : state.lastError ?? null;
  // Elasticsearch errors can name the user who enabled sessions, their roles and indices, so
  // only users who can set sessions up are told why a run failed; the others just that one did.
  const lastError: SessionsRunError | null =
    recordedError && !withDetails ? { ...recordedError, message: null } : recordedError;
  const lagging =
    !rebuilding &&
    lagSeconds !== null &&
    lagSeconds > sessionsLagThresholdSeconds(settings.frequency);

  return {
    ...MISSING_STATUS,
    installed: true,
    health: healthOf({ apiKeyInvalid, lastError, lagging }),
    installedVersion,
    rebuilding,
    apiKeyInvalid,
    lagSeconds,
    summarizedUntil,
    lastRunAt: state.lastRunAt ?? null,
    lastSuccessAt: state.lastSuccessAt ?? null,
    lastError,
    enabledBy: withDetails ? task.userScope?.userName ?? null : null,
  };
};
