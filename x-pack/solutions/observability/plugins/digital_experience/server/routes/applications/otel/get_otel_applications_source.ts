/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  SESSIONS_LOOKBACK_DAYS,
  type SessionsSettings,
  type SessionsStatus,
} from '../../../../common/sessions';
import { createDigitalExperienceTracedEsClient } from '../../../lib/create_digital_experience_traced_es_client';
import { describeError, isAccessDenied } from '../../../lib/helpers/errors';
import { getSessionsStatus } from '../../../services/sessions/sessions_status';
import type { SourceApplications } from '../types';
import type { GetOtelApplicationsParams } from './get_otel_applications';
import { getOtelApplications } from './get_otel_applications';
import { getSessionsApplications } from './get_sessions_applications';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The status changes at most once a run, while the list is refreshed often. */
const SESSIONS_STATUS_TTL_MS = 30_000;

interface GetOtelApplicationsFromBestSourceParams extends GetOtelApplicationsParams {
  /** Reads the summaries task's status; `undefined` without Task Manager, so without sessions. */
  taskManager: TaskManagerStartContract | undefined;
  /** The settings the summaries task runs with, for its lag threshold. */
  getSessionsSettings: () => Promise<SessionsSettings>;
  logger: Logger;
}

/**
 * The summaries task summarizes the events of the last `SESSIONS_LOOKBACK_DAYS` days, from the
 * start of that day, so a range that starts earlier is partly missing from the sessions index.
 */
const sessionsLookbackStart = (now: number): number =>
  Math.floor((now - SESSIONS_LOOKBACK_DAYS * DAY_MS) / DAY_MS) * DAY_MS;

/** Sessions that are set up, healthy and caught up with the events since they were enabled. */
const isReadable = ({ installed, health, rebuilding }: SessionsStatus): boolean =>
  installed && health === 'healthy' && !rebuilding;

/** The latest read of the status, shared by the requests of the next `SESSIONS_STATUS_TTL_MS`. */
let sessionsReadable: { expiresAt: number; result: Promise<boolean> } | undefined;

/** Forgets the shared status read; the tests, which share this module, start from none. */
export const clearSessionsStatusCache = (): void => {
  sessionsReadable = undefined;
};

/**
 * Whether the sessions can be read, from a status that requests share, so it is not tied to the
 * abort signal of the one that read it. A failed read is not remembered.
 */
const areSessionsReadable = ({
  taskManager,
  getSessionsSettings,
  logger,
}: GetOtelApplicationsFromBestSourceParams): Promise<boolean> => {
  if (!taskManager) {
    return Promise.resolve(false);
  }
  const now = Date.now();
  if (sessionsReadable && sessionsReadable.expiresAt > now) {
    return sessionsReadable.result;
  }
  const result: Promise<boolean> = getSessionsSettings()
    .then((settings) => getSessionsStatus({ taskManager, settings }))
    .then(isReadable)
    .catch((error) => {
      logger.debug(`Could not read the sessions status: ${describeError(error)}`);
      if (sessionsReadable?.result === result) {
        sessionsReadable = undefined;
      }
      return false;
    });
  sessionsReadable = { expiresAt: now + SESSIONS_STATUS_TTL_MS, result };
  return result;
};

/**
 * Whether the sessions index holds the whole time range: the range is within the lookback, and the
 * sessions are readable.
 */
const sessionsCoverTimeRange = async (
  params: GetOtelApplicationsFromBestSourceParams
): Promise<boolean> =>
  params.start >= sessionsLookbackStart(Date.now()) && areSessionsReadable(params);

/**
 * The EDOT Browser applications, from the sessions index when it can answer and from the raw
 * events otherwise, in the same shape. The raw search runs when sessions are not set up, failing,
 * lagging or still being built, when the time range reaches back past the sessions' lookback,
 * when the user can't read the sessions index, and when the sessions hold no application, which
 * the raw events still can, e.g. ones that send no `session.id`. An application that sends none
 * while others do is not in the sessions, so it is missing from the list.
 */
export const getOtelApplicationsFromBestSource = async (
  params: GetOtelApplicationsFromBestSourceParams
): Promise<SourceApplications> => {
  const { taskManager, getSessionsSettings, logger, ...searchParams } = params;
  const { esClient, signal, start, end, environment } = searchParams;

  if (await sessionsCoverTimeRange(params)) {
    try {
      const sessionsApplications = await getSessionsApplications({
        tracedEsClient: createDigitalExperienceTracedEsClient({
          client: esClient,
          logger,
          abortSignal: signal,
        }),
        start,
        end,
        environment,
      });
      if (sessionsApplications.applications.length > 0) {
        return sessionsApplications;
      }
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      // A user without access to the sessions index is expected, so only the rest is a warning.
      const message = `Could not read the applications from the sessions, reading the raw events: ${describeError(
        error
      )}`;
      if (isAccessDenied(error)) {
        logger.debug(message);
      } else {
        logger.warn(message);
      }
    }
  }

  return getOtelApplications(searchParams);
};
