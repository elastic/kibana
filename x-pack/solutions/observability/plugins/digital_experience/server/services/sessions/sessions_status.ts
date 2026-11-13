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
  reason: null,
  lagSeconds: null,
  summarizedUntil: null,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  enabledBy: null,
  retentionDays: SESSIONS_LOOKBACK_DAYS,
};

const API_KEY_INVALID_REASON =
  'The API key the session summaries are built with was invalidated or has expired. A user with the Digital Experience "Set up session summaries" privilege must enable sessions again.';

/**
 * The last run's error for users who can't set sessions up: Elasticsearch errors can name the user
 * who enabled them, their roles and indices.
 */
export const RUN_FAILED_MESSAGE =
  'The last run failed. A user with the Digital Experience "Set up session summaries" privilege can see why.';

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

/** Health and reason, the worst first: an unusable key, a failing run, then a lagging one. */
const healthOf = ({
  apiKeyInvalid,
  lastError,
  lagging,
  lagSeconds,
}: {
  apiKeyInvalid: boolean;
  lastError: SessionsTaskState['lastError'];
  lagging: boolean;
  lagSeconds: number | null;
}): { health: SessionsHealth; reason: string | null } => {
  if (apiKeyInvalid) {
    return { health: 'degraded', reason: API_KEY_INVALID_REASON };
  }
  if (lastError) {
    return {
      health: 'degraded',
      reason:
        lastError.message === RUN_FAILED_MESSAGE
          ? RUN_FAILED_MESSAGE
          : `The last run failed: ${lastError.message}`,
    };
  }
  if (lagging && lagSeconds !== null) {
    return {
      health: 'lagging',
      reason: `Session summaries are ${Math.round(lagSeconds / 60)} minutes behind the events.`,
    };
  }
  return { health: 'healthy', reason: null };
};

/**
 * The sessions status, from the summaries task and what its last run recorded. Without Task
 * Manager, nothing can build sessions, so they're missing. Who enabled sessions and why the last
 * run failed are only included `withDetails`, for users who can set sessions up.
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
  const lastError =
    recordedError && !withDetails
      ? { ...recordedError, message: RUN_FAILED_MESSAGE }
      : recordedError;
  const lagging =
    !rebuilding &&
    lagSeconds !== null &&
    lagSeconds > sessionsLagThresholdSeconds(settings.frequency);

  return {
    ...MISSING_STATUS,
    installed: true,
    ...healthOf({ apiKeyInvalid, lastError, lagging, lagSeconds }),
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
