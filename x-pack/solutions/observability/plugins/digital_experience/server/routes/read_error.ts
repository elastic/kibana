/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, internal } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { i18n } from '@kbn/i18n';
import { ALL_SESSIONS_INDEX_PATTERN, SESSIONS_SOURCE_INDICES } from '../../common/sessions';
import { describeError } from '../lib/helpers/errors';

const NO_ACCESS_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.api.noAccess', {
  defaultMessage:
    'Reading sessions requires the read index privilege on {sessionsIndex}, and on {sourceIndices} for the session timeline.',
  values: {
    sessionsIndex: ALL_SESSIONS_INDEX_PATTERN,
    sourceIndices: SESSIONS_SOURCE_INDICES.join(', '),
  },
});

export const LOAD_FAILED_MESSAGE = i18n.translate(
  'xpack.digitalExperience.sessions.api.loadFailed',
  {
    defaultMessage: 'Could not load the sessions. Check the Kibana server logs for details.',
  }
);

/**
 * Maps a read failure to a client error: an Elasticsearch 403 names the index privileges the
 * reads need; anything else is logged and hidden, as Elasticsearch details name users and indices.
 */
export const toReadError = (error: unknown, logger: Logger, what: string) => {
  if (isResponseError(error) && error.statusCode === 403) {
    return forbidden(NO_ACCESS_MESSAGE);
  }
  logger.error(`Could not load ${what}: ${describeError(error)}`);
  return internal(LOAD_FAILED_MESSAGE);
};
