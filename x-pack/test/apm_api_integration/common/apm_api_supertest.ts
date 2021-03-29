/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import supertest from 'supertest';
import request from 'superagent';
import { MaybeParams } from '../../../plugins/apm/server/routes/typings';
import { parseEndpoint } from '../../../plugins/apm/common/apm_api/parse_endpoint';
import { APMAPI } from '../../../plugins/apm/server/routes/create_apm_api';
import type { APIReturnType } from '../../../plugins/apm/public/services/rest/createCallApmApi';

export function createApmApiSupertest(st: supertest.SuperTest<supertest.Test>) {
  return async <TPath extends keyof APMAPI['_S']>(
    options: {
      endpoint: TPath;
    } & MaybeParams<APMAPI['_S'], TPath>
  ): Promise<{
    status: number;
    body: APIReturnType<TPath>;
  }> => {
    const { endpoint } = options;

    // @ts-expect-error
    const params = 'params' in options ? options.params : {};

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
