/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { SESSIONS_TASK_ID, type SessionsSettings } from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import { checkSessionsPrivileges } from './sessions_privileges';
import { createSessionsIndex, putSessionsIndexTemplate } from './sessions_index';
import { scheduleSessionsTask } from './sessions_task';

/** The steps of enabling sessions after the privilege checks, in order. */
export const SESSIONS_ENABLE_STEPS = ['credentials', 'template', 'index', 'task'] as const;
export type SessionsEnableStep = (typeof SESSIONS_ENABLE_STEPS)[number];

/**
 * A step of enabling sessions failed. The steps before it stay done, and are harmless on their
 * own: enabling again repeats them and carries on from the failed one.
 */
export class SessionsEnableError extends Error {
  constructor(public readonly step: SessionsEnableStep, cause: unknown) {
    super(`Enabling sessions failed at the ${step} step: ${describeError(cause)}`, { cause });
    this.name = 'SessionsEnableError';
  }
}

export const NO_ENCRYPTION_KEY_MESSAGE =
  'Kibana cannot store the API key the session summaries are built with. Set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.';

const step = async <T>(name: SessionsEnableStep, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw new SessionsEnableError(name, error);
  }
};

/**
 * Enables sessions for the requesting user: checks they can read every event in full and write
 * the summaries, puts the index template and creates the index, then schedules the summaries task
 * with an API key Task Manager grants on their behalf. Enabling again replaces the key, so the task
 * then reads what that user can read, and keeps the summaries built so far.
 */
export const enableSessions = async ({
  esClient,
  request,
  taskManager,
  canEncrypt,
  settings,
  isServerless,
  logger,
}: {
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  taskManager: TaskManagerStartContract;
  canEncrypt: boolean;
  settings: SessionsSettings;
  isServerless: boolean;
  logger: Logger;
}): Promise<void> => {
  await checkSessionsPrivileges(esClient.asCurrentUser, { isServerless });
  await step('credentials', async () => {
    if (!canEncrypt) {
      throw new Error(NO_ENCRYPTION_KEY_MESSAGE);
    }
  });
  await step('template', () => putSessionsIndexTemplate(esClient.asInternalUser));
  await step('index', () => createSessionsIndex(esClient.asCurrentUser));
  await step('task', () => scheduleSessionsTask({ taskManager, request, settings }));
  // Start building now rather than at the next interval; the interval runs it anyway.
  try {
    await taskManager.runSoon(SESSIONS_TASK_ID);
  } catch (error) {
    logger.debug(`Could not run the sessions task right away: ${describeError(error)}`);
  }
};
