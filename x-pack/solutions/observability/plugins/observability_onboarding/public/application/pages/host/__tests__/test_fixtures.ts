/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

export const buildFetchError = (
  message = 'boom',
  status = 500
): IHttpFetchError<ResponseErrorBody> =>
  Object.assign(new Error(message), {
    name: 'HttpFetchError',
    req: {} as Request,
    request: {} as Request,
    response: { status, statusText: message, url: '/test' } as Response,
    body: { message, statusCode: status } as ResponseErrorBody,
  }) as IHttpFetchError<ResponseErrorBody>;
