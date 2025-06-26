/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomHttpResponseOptions, KibanaResponseFactory } from '@kbn/core-http-server';

const statusToErrorMessage = (
  statusCode: number
):
  | 'Bad Request'
  | 'Unauthorized'
  | 'Forbidden'
  | 'Not Found'
  | 'Conflict'
  | 'Internal Error'
  | '(unknown error)' => {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Error';
    default:
      return '(unknown error)';
  }
};

/** Creates responses */
export class ResponseFactory {
  /** constructor */
  constructor(private response: KibanaResponseFactory) {}

  /** error */
  // @ts-expect-error upgrade typescript v4.9.5
  error<T>({ statusCode, body, headers }: CustomHttpResponseOptions<T>) {
    // @ts-expect-error upgrade typescript v4.9.5
    const contentType: CustomHttpResponseOptions<T>['headers'] = {
      'content-type': 'application/json',
    };
    // @ts-expect-error upgrade typescript v4.9.5
    const defaultedHeaders: CustomHttpResponseOptions<T>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      body: Buffer.from(
        JSON.stringify({
          message: body ?? statusToErrorMessage(statusCode),
          status_code: statusCode,
        })
      ),
      headers: defaultedHeaders,
      statusCode,
    });
  }
}

/** builds a response */
export const buildResponse = (response: KibanaResponseFactory): ResponseFactory =>
  new ResponseFactory(response);
