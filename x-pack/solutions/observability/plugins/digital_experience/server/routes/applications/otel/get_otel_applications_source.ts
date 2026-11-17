/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SESSIONS_LOOKBACK_DAYS, type SessionsSettings } from '../../../../common/sessions';
import { getSessionsStatus } from '../../../sessions/sessions_setup';
import { describeError, isAccessDenied } from '../../../lib/helpers/errors';
import type { SourceApplications } from '../types';
import type { GetOtelApplicationsParams } from './get_otel_applications';
import { getOtelApplications } from './get_otel_applications';
import { getSessionsApplications } from './get_sessions_applications';

const DAY_MS = 24 * 60 * 60 * 1000;

interface GetOtelApplicationsFromBestSourceParams extends GetOtelApplicationsParams {
  /** Reads the status of the sessions transforms, which only needs their metadata. */
  internalEsClient: ElasticsearchClient;
  sessionsSettings: SessionsSettings;
  logger: Logger;
}

/**
 * The sessions transform summarizes the events of the last `SESSIONS_LOOKBACK_DAYS` days, from
 * the start of that day, so a range that starts earlier is partly missing from the sessions index.
 */
const sessionsLookbackStart = (now: number): number =>
  Math.floor((now - SESSIONS_LOOKBACK_DAYS * DAY_MS) / DAY_MS) * DAY_MS;

/**
 * Whether the sessions index holds the whole time range: sessions are set up and current, their
 * transforms healthy and past their first checkpoint, and the range within the lookback.
 */
const sessionsCoverTimeRange = async ({
  internalEsClient,
  sessionsSettings,
  start,
  signal,
  logger,
}: GetOtelApplicationsFromBestSourceParams): Promise<boolean> => {
  if (start < sessionsLookbackStart(Date.now())) {
    return false;
  }
  try {
    const status = await getSessionsStatus(internalEsClient, {
      settings: sessionsSettings,
      signal,
    });
    return status.installed && status.health === 'healthy' && !status.rebuilding;
  } catch (error) {
    logger.debug(`Could not read the sessions status: ${describeError(error)}`);
    return false;
  }
};

/**
 * The EDOT Browser applications, from the sessions index when it can answer and from the raw
 * events otherwise, in the same shape. The raw search runs when sessions are not set up, outdated,
 * unhealthy or still being built, when the time range reaches back past the sessions' lookback,
 * when the user can't read the sessions index, and when the sessions hold no application, which
 * the raw events still can, e.g. ones that send no `session.id`.
 */
export const getOtelApplicationsFromBestSource = async (
  params: GetOtelApplicationsFromBestSourceParams
): Promise<SourceApplications> => {
  const { internalEsClient, sessionsSettings, logger, ...searchParams } = params;

  if (await sessionsCoverTimeRange(params)) {
    try {
      const sessionsApplications = await getSessionsApplications(searchParams);
      if (sessionsApplications.applications.length > 0) {
        return sessionsApplications;
      }
    } catch (error) {
      if (searchParams.signal?.aborted) {
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
