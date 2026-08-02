/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

interface CreateHttpFetchErrorParams {
  /**
   * Response body. Deliberately omittable: a Kibana `404` has **no body**, and
   * that is the case error handling gets wrong most often.
   */
  body?: unknown;
  message?: string;
  /** Omit to model a transport failure, which carries no response at all. */
  status?: number;
}

/**
 * Builds a value `isHttpFetchError` accepts — an `Error` carrying `request` —
 * so tests can exercise status-specific branches without a real `fetch`.
 */
export const createHttpFetchError = ({
  body,
  message = 'Request failed',
  status,
}: CreateHttpFetchErrorParams = {}): IHttpFetchError =>
  Object.assign(new Error(message), {
    body,
    request: {} as Request,
    response: status == null ? undefined : ({ status } as Response),
  }) as IHttpFetchError;
