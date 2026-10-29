/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, internal, isBoom } from '@hapi/boom';
import { isRequestAbortedError, isResponseError } from '@kbn/es-errors';
import { i18n } from '@kbn/i18n';

const NO_ACCESS_MESSAGE = i18n.translate('xpack.digitalExperience.api.noAccess', {
  defaultMessage: "You don't have read access to the application data.",
});

const LOAD_FAILED_MESSAGE = i18n.translate('xpack.digitalExperience.api.loadFailed', {
  defaultMessage: 'Could not load the data. Check the Kibana server logs for details.',
});

/** Whether Elasticsearch or Kibana denied access (a 403). */
export const isAccessDenied = (error: unknown): boolean => {
  // Kibana denies with a Boom error, e.g. when reading the APM index settings without APM access.
  if (isBoom(error)) {
    return error.output.statusCode === 403;
  }
  // `APMEventClient` wraps the Elasticsearch error in `originalError`.
  const esError = error instanceof Error && 'originalError' in error ? error.originalError : error;
  return isResponseError(esError) && esError.statusCode === 403;
};

/** The message of an error of any shape, for the server logs. */
export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The error a route answers with, without the Elasticsearch details, which name the user, roles and
 * indices; aborted requests and errors the route chose (Boom) are returned as they are.
 */
export const toClientError = (error: unknown): Error => {
  if (isRequestAbortedError(error) || isBoom(error)) {
    return error;
  }
  return isAccessDenied(error) ? forbidden(NO_ACCESS_MESSAGE) : internal(LOAD_FAILED_MESSAGE);
};
