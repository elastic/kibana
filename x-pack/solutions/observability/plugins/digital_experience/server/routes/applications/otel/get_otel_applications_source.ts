/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { SESSIONS_LOOKBACK_DAYS, type SessionsSettings } from '../../../../common/sessions';
import { createDigitalExperienceTracedEsClient } from '../../../lib/create_digital_experience_traced_es_client';
import { describeError, isAccessDenied } from '../../../lib/helpers/errors';
import type { SessionsReadableCache } from '../../../services/sessions/sessions_readable';
import type { SourceApplications } from '../types';
import type { GetOtelApplicationsParams } from './get_otel_applications';
import { getOtelApplications } from './get_otel_applications';
import { getSessionsApplications } from './get_sessions_applications';

const DAY_MS = 24 * 60 * 60 * 1000;

interface GetOtelApplicationsFromBestSourceParams extends GetOtelApplicationsParams {
  /** Reads the summaries task's status; `undefined` without Task Manager, so without sessions. */
  taskManager: TaskManagerStartContract | undefined;
  sessionsSettings: SessionsSettings;
  /** Whether the sessions can be read, shared by the requests of one refresh. */
  sessionsReadable: SessionsReadableCache;
  logger: Logger;
}

/**
 * The summaries task summarizes the events of the last `SESSIONS_LOOKBACK_DAYS` days, from the
 * start of that day, so a range that starts earlier is partly missing from the sessions index.
 */
const sessionsLookbackStart = (now: number): number =>
  Math.floor((now - SESSIONS_LOOKBACK_DAYS * DAY_MS) / DAY_MS) * DAY_MS;

/**
 * Whether the sessions index holds the whole time range: the range is within the lookback, and the
 * sessions are readable.
 */
const sessionsCoverTimeRange = async (
  params: GetOtelApplicationsFromBestSourceParams
): Promise<boolean> =>
  params.start >= sessionsLookbackStart(Date.now()) &&
  params.sessionsReadable.areSessionsReadable({
    taskManager: params.taskManager,
    settings: params.sessionsSettings,
    logger: params.logger,
  });

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
  const { taskManager, sessionsSettings, sessionsReadable, logger, ...searchParams } = params;
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
