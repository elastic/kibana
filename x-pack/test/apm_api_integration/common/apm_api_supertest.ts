/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import supertest from 'supertest';
import request from 'superagent';
import { parseEndpoint } from '../../../plugins/apm/common/apm_api/parse_endpoint';
import type {
  APIReturnType,
  APIClientRequestParamsOf,
} from '../../../plugins/apm/public/services/rest/create_call_apm_api';
import type { APIEndpoint } from '../../../plugins/apm/server';

export function createApmApiClient(st: supertest.SuperTest<supertest.Test>) {
  return async <TEndpoint extends APIEndpoint>(
    options: {
      endpoint: TEndpoint;
    } & APIClientRequestParamsOf<TEndpoint> & { params?: { query?: { _inspect?: boolean } } }
  ): Promise<SupertestReturnType<TEndpoint>> => {
    const { endpoint } = options;

    const params = 'params' in options ? (options.params as Record<string, any>) : {};

    const { method, pathname } = parseEndpoint(endpoint, params?.path);
    const url = format({ pathname, query: params?.query });

    const res = params.body
      ? await st[method](url).send(params.body).set('kbn-xsrf', 'foo')
      : await st[method](url).set('kbn-xsrf', 'foo');

    // supertest doesn't throw on http errors
    if (res.status !== 200) {
      throw new ApmApiError(res, endpoint);
    }

    return res;
  };
}

export type ApmApiSupertest = ReturnType<typeof createApmApiClient>;

export class ApmApiError extends Error {
  res: request.Response;

  constructor(res: request.Response, endpoint: string) {
    super(
      `Unhandled ApmApiError.
Status: "${res.status}"
Endpoint: "${endpoint}"
Body: ${JSON.stringify(res.body)}`
    );

    this.res = res;
  }
}

export interface SupertestReturnType<TEndpoint extends APIEndpoint> {
  status: number;
  body: APIReturnType<TEndpoint>;
}
