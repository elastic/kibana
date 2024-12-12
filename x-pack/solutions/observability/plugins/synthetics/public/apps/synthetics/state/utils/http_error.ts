/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

export interface IHttpSerializedFetchError<P = unknown> {
  name: string;
  body: {
    error?: string;
    message?: string;
    statusCode?: number;
  };
  requestUrl: string;
  getPayload?: P;
}

export const serializeHttpFetchError = <P>(
  error: IHttpFetchError,
  getPayload?: P
): IHttpSerializedFetchError<P> => {
  if (error.name && !error.body) {
    return {
      name: error.name,
      body: {
        error: error.toString(),
        message: error.message,
        statusCode: undefined,
      },
      requestUrl: error?.request?.url,
      getPayload,
    };
  }

  const body = error.body as { error: string; message: string; statusCode: number };
  return {
    name: error.name,
    body: {
      error: body!.error,
      message: body!.message,
      statusCode: body!.statusCode,
    },
    requestUrl: error.request.url,
    getPayload,
  };
};
