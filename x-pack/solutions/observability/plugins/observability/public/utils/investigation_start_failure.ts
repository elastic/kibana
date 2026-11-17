/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isHttpFetchError,
  type IHttpFetchError,
  type ResponseErrorBody,
} from '@kbn/core-http-browser';

const DAILY_LIMIT_STATUS_CODE = 429;

/** Kibana routes answer errors with a `ResponseErrorBody`. */
const isKibanaHttpError = (error: unknown): error is IHttpFetchError<ResponseErrorBody> =>
  isHttpFetchError(error);

/**
 * The reason a start failed. An HTTP error carries the server's message in its body: its own
 * message is the status text, which is empty over HTTP/2.
 */
export const getStartFailureMessage = (error: unknown): string => {
  if (isKibanaHttpError(error) && error.body?.message) {
    return error.body.message;
  }
  return error instanceof Error ? error.message : String(error);
};

/** Whether a start was refused because a daily investigation limit was reached. */
export const isDailyLimitError = (error: unknown): boolean =>
  isKibanaHttpError(error) &&
  (error.response?.status ?? error.body?.statusCode) === DAILY_LIMIT_STATUS_CODE;
