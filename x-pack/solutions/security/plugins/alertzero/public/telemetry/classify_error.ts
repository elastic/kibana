/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import type { UiErrorClass } from './constants';

const STATUS_CLASSES: Readonly<Record<number, UiErrorClass>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  408: 'timeout',
  409: 'conflict',
  429: 'rate_limited',
};

/**
 * Maps a failed request to a fixed error class from its HTTP status. It never reads the error's
 * message: a request that got no response is `network`, and anything that is not an HTTP error
 * is `unknown`.
 */
export const classifyError = (error: unknown): UiErrorClass => {
  if (!isHttpFetchError(error)) {
    return 'unknown';
  }
  const status = error.response?.status;
  if (status === undefined) {
    return 'network';
  }
  return STATUS_CLASSES[status] ?? (status >= 500 ? 'server' : 'unknown');
};
