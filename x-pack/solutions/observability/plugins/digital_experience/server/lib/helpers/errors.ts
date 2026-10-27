/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { isResponseError } from '@kbn/es-errors';

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
