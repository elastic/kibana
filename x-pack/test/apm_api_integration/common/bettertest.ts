/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from 'url';
import supertest from 'supertest';
import request from 'superagent';

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

export type BetterTest = <T>(options: BetterTestOptions) => Promise<BetterTestResponse<T>>;

interface BetterTestOptions {
  pathname: string;
  query?: Record<string, any>;
  method?: HttpMethod;
  body?: any;
}

export interface BetterTestResponse<T> {
  status: number;
  body: T;
}

/*
 * This is a wrapper around supertest that throws an error if the response status is not 200.
 * This is useful for tests that expect a 200 response
 * It also makes it easier to debug tests that fail because of a 500 response.
 */
export function getBettertest(st: supertest.SuperTest<supertest.Test>) {
  return async <T>({
    pathname,
    method = 'get',
    query,
    body,
  }: BetterTestOptions): Promise<BetterTestResponse<T>> => {
    const url = format({ pathname, query });

    let res: request.Response;
    if (body) {
      res = await st[method](url).send(body).set('kbn-xsrf', 'true');
    } else {
      res = await st[method](url).set('kbn-xsrf', 'true');
    }

    // supertest doesn't throw on http errors
    if (res?.status !== 200) {
      throw new BetterTestError(res);
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
