/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SessionsSettings, SessionsStatus } from '../../../common/sessions';
import { describeError } from '../../lib/helpers/errors';
import { getSessionsStatus } from './sessions_status';

/** The status changes at most once a run, while the list is refreshed often. */
const SESSIONS_STATUS_TTL_MS = 30_000;

/** Sessions that are set up, healthy and caught up with the events since they were enabled. */
const isReadable = ({ installed, health, rebuilding }: SessionsStatus): boolean =>
  installed && health === 'healthy' && !rebuilding;

export interface SessionsReadableParams {
  /** `undefined` without Task Manager, so without sessions. */
  taskManager: TaskManagerStartContract | undefined;
  settings: SessionsSettings;
  logger: Logger;
}

export interface SessionsReadableCache {
  areSessionsReadable: (params: SessionsReadableParams) => Promise<boolean>;
}

/**
 * Remembers for a moment whether the applications list can read the sessions, so the requests of
 * one refresh ask Task Manager once. The plugin makes it at setup and hands it to the routes: it
 * holds the answer for every request, so it is not state a single one owns.
 */
export const createSessionsReadableCache = (): SessionsReadableCache => {
  let readable: { expiresAt: number; result: Promise<boolean> } | undefined;

  return {
    /**
     * Whether the sessions can be read, from a status the requests share, so it is not tied to the
     * abort signal of the one that read it. A failed read is not remembered.
     */
    areSessionsReadable: ({ taskManager, settings, logger }) => {
      if (!taskManager) {
        return Promise.resolve(false);
      }
      const now = Date.now();
      if (readable && readable.expiresAt > now) {
        return readable.result;
      }
      const result: Promise<boolean> = getSessionsStatus({ taskManager, settings })
        .then(isReadable)
        .catch((error) => {
          logger.debug(`Could not read the sessions status: ${describeError(error)}`);
          if (readable?.result === result) {
            readable = undefined;
          }
          return false;
        });
      readable = { expiresAt: now + SESSIONS_STATUS_TTL_MS, result };
      return result;
    },
  };
};
