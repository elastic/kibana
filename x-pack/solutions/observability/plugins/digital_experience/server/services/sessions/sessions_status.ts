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
  sessionsLagThresholdSeconds,
  type SessionsHealth,
  type SessionsRunError,
  type SessionsSettings,
  type SessionsStatus,
  type SessionsStatusResponse,
} from '../../../common/sessions';
import {
  BROWSER_SESSIONS_PLATFORM,
  MOBILE_SESSIONS_PLATFORM,
  type SessionsPlatform,
} from './sessions_platforms';
import type { SessionsTaskState } from './sessions_task';

const missingStatusOf = ({ version }: SessionsPlatform): SessionsStatus => ({
  installed: false,
  disabled: false,
  health: 'missing',
  installedVersion: null,
  currentVersion: version,
  rebuilding: false,
  apiKeyInvalid: false,
  lagSeconds: null,
  summarizedUntil: null,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  enabledBy: null,
  retentionDays: SESSIONS_LOOKBACK_DAYS,
  autoEnable: false,
  canManage: false,
});

/** A platform's summaries task, or undefined before sessions are set up. */
export const getSessionsTask = async (
  taskManager: TaskManagerStartContract,
  { taskId }: SessionsPlatform
): Promise<ConcreteTaskInstance | undefined> => {
  try {
    return await taskManager.get(taskId);
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

interface SessionsStatusParams {
  taskManager: TaskManagerStartContract | undefined;
  settings: SessionsSettings;
  canManage?: boolean;
  now?: number;
}

/**
 * A platform's sessions status, from its summaries task and what its last run recorded. Without
 * Task Manager, nothing can build sessions, so they're missing. Who enabled sessions and why the
 * last run failed are only told to users who `canManage` sessions.
 */
export const getSessionsStatus = async ({
  platform,
  taskManager,
  settings,
  canManage = false,
  now = Date.now(),
}: SessionsStatusParams & { platform: SessionsPlatform }): Promise<SessionsStatus> => {
  const missingStatus = { ...missingStatusOf(platform), canManage };
  const task = taskManager ? await getSessionsTask(taskManager, platform) : undefined;
  if (!task) {
    return missingStatus;
  }
  const state: SessionsTaskState = task.state;
  const installedVersion = state.version ?? null;
  const summarizedUntil = state.checkpoint ?? null;
  const lagSeconds =
    summarizedUntil === null
      ? null
      : Math.max(0, Math.round((now - Date.parse(summarizedUntil)) / 1000));
  const shared = {
    ...missingStatus,
    installed: true,
    installedVersion,
    lagSeconds,
    summarizedUntil,
    lastRunAt: state.lastRunAt ?? null,
    lastSuccessAt: state.lastSuccessAt ?? null,
    enabledBy: canManage ? task.userScope?.userName ?? null : null,
  };
  // Turned off on purpose: neither rebuilding nor failing, as the task doesn't run.
  if (task.enabled === false) {
    return { ...shared, disabled: true, health: 'disabled' };
  }
  const rebuilding = state.caughtUp !== true || installedVersion !== platform.version;
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
  // only users who manage sessions are told why a run failed; the others just that one did.
  const lastError: SessionsRunError | null =
    recordedError && !canManage ? { ...recordedError, message: null } : recordedError;
  const lagging =
    !rebuilding &&
    lagSeconds !== null &&
    lagSeconds > sessionsLagThresholdSeconds(settings.frequency);

  return {
    ...shared,
    health: healthOf({ apiKeyInvalid, lastError, lagging }),
    rebuilding,
    apiKeyInvalid,
    lastError,
  };
};

/** The browser sessions status, as the app reads it, with the mobile one under `mobile`. */
export const getSessionsStatusResponse = async (
  params: SessionsStatusParams
): Promise<SessionsStatusResponse> => {
  const [browser, mobile] = await Promise.all([
    getSessionsStatus({ ...params, platform: BROWSER_SESSIONS_PLATFORM }),
    getSessionsStatus({ ...params, platform: MOBILE_SESSIONS_PLATFORM }),
  ]);
  return { ...browser, mobile };
};
