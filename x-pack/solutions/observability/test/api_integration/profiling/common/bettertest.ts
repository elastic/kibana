/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import type supertest from 'supertest';
import type request from 'superagent';

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

export type BetterTest = <T extends any>(options: {
  pathname: string;
  query?: Record<string, any>;
  method?: HttpMethod;
  body?: any;
}) => Promise<{ status: number; body: T }>;

/*
 * This is a wrapper around supertest that add the correct headers
 */
export function getBettertest(st: supertest.Agent): BetterTest {
  return async ({ pathname, method = 'get', query, body }) => {
    const url = format({ pathname, query });

    let res: request.Response;
    if (body) {
      res = await st[method](url)
        .send(body)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana');
    } else {
      res = await st[method](url)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana');
    }

    return res;
  };
}

type ErrorResponse = Omit<request.Response, 'body'> & {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes: object;
  };
};

export class BetterTestError extends Error {
  res: ErrorResponse;

  constructor(res: request.Response) {
    // @ts-expect-error
    const req = res.req as any;
    super(
      `Unhandled BetterTestError:
Status: "${res.status}"
Path: "${req.method} ${req.path}"
Body: ${JSON.stringify(res.body)}`
    );

    this.res = res;
  }
}
