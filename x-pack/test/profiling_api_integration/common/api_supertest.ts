/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRequest } from '@kbn/server-route-repository';
import request from 'superagent';
import supertest from 'supertest';
import { format } from 'url';

export function createProfilingApiClient(st: supertest.Agent) {
  return async (options: {
    endpoint: string;
    params?: {
      query?: any;
      path?: any;
    };
  }) => {
    const { endpoint } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname, version } = formatRequest(endpoint, params.path);
    const url = format({ pathname, query: params?.query });

    const headers: Record<string, string> = { 'kbn-xsrf': 'foo' };

    if (version) {
      headers['Elastic-Api-Version'] = version;
    }

    let res: request.Response;
    if (params.body) {
      res = await st[method](url).send(params.body).set(headers);
    } else {
      res = await st[method](url).set(headers);
    }

    // supertest doesn't throw on http errors
    if (res?.status !== 200 && res?.status !== 202) {
      throw new ProfilingApiError(res, endpoint);
    }

    return res;
  };
}

type ApiErrorResponse = Omit<request.Response, 'body'> & {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes: object;
  };
};

export type ProfilingApiSupertest = ReturnType<typeof createProfilingApiClient>;

export class ProfilingApiError extends Error {
  res: ApiErrorResponse;

  constructor(res: request.Response, endpoint: string) {
    super(
      `Unhandled ProfilingApiError.
Status: "${res.status}"
Endpoint: "${endpoint}"
Body: ${JSON.stringify(res.body)}`
    );

    this.res = res;
  }
}
