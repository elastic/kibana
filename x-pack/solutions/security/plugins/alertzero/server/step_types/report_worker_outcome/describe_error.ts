/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const statusCodeOf = (error: Error): number | undefined => {
  const { meta } = error as Error & { meta?: { statusCode?: unknown } };
  return typeof meta?.statusCode === 'number' ? meta.statusCode : undefined;
};

/** An error's type and message, for debug logs only: the message may name indices or ids. */
export const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : `non-error ${typeof error}`;

/** An error's type and HTTP status only, safe for warn logs. */
export const describeErrorKind = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return `non-error ${typeof error}`;
  }
  const statusCode = statusCodeOf(error);
  return statusCode === undefined ? error.name : `${error.name} (status ${statusCode})`;
};
