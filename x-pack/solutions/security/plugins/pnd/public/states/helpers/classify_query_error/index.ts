/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

/**
 * The statuses PND surfaces distinctly. `workflowsUnavailable` is separate from
 * `serverError` because a 503 means "the queue could not be read", never
 * "the queue is empty" — and it is the expected status on any Kibana that is
 * not serving `workflowsManagement.management`.
 */
export const PND_QUERY_ERROR_KINDS = [
  'badRequest',
  'conflict',
  'forbidden',
  'notFound',
  'serverError',
  'unknown',
  'workflowsUnavailable',
] as const;

export type PndQueryErrorKind = (typeof PND_QUERY_ERROR_KINDS)[number];

/** The HTTP status behind an error, or `undefined` for a transport failure. */
export const getHttpStatus = (error: unknown): number | undefined =>
  isHttpFetchError(error) ? error.response?.status : undefined;

export const classifyQueryError = (error: unknown): PndQueryErrorKind => {
  const status = getHttpStatus(error);

  if (status == null) {
    return 'unknown';
  }

  if (status === 503) {
    return 'workflowsUnavailable';
  }

  if (status >= 500) {
    return 'serverError';
  }

  switch (status) {
    case 400:
      return 'badRequest';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    default:
      return 'unknown';
  }
};
