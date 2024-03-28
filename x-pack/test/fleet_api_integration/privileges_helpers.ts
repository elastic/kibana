/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest, { type SuperTest } from 'supertest';

interface PrivilegeTestScenario {
  user: {
    username: string;
    password: string;
  };
  statusCode: number;
}

interface PrivilegeTestRoute {
  method: string;
  path: string;
  send?: any;
  beforeEach?: () => any;
  afterEach?: () => any;
  scenarios: PrivilegeTestScenario[];
}

export function runPrivilegeTests(
  routes: PrivilegeTestRoute[],
  supertestWithoutAuth: SuperTest<supertest.Test>
) {
  for (const route of routes) {
    describe(`${route.method} ${route.path}`, () => {
      if (route.beforeEach) {
        beforeEach(() => {
          return route.beforeEach ? route.beforeEach() : undefined;
        });
      }
      if (route.afterEach) {
        afterEach(() => {
          return route.afterEach ? route.afterEach() : undefined;
        });
      }
      for (const scenario of route.scenarios) {
        const expectFn = (res: supertest.Response) => {
          if (res.status !== scenario.statusCode) {
            let message = '';
            try {
              message = res.body.error
                ? `${res.body.error}:${res.body.message}`
                : res.body.message ?? '';
            } catch (err) {
              // swallow error
            }
            throw new Error(
              `Expected status ${scenario.statusCode}, got: ${res.status} ${message}`
            );
          }
        };
        it(`should return a ${scenario.statusCode} for user: ${scenario.user.username}`, async () => {
          if (route.method === 'GET') {
            return supertestWithoutAuth
              .get(route.path)
              .auth(scenario.user.username, scenario.user.password)
              .expect(expectFn);
          } else if (route.method === 'PUT') {
            return supertestWithoutAuth
              .put(route.path)
              .set('kbn-xsrf', 'xx')
              .auth(scenario.user.username, scenario.user.password)
              .send(route.send)
              .expect(expectFn);
          } else if (route.method === 'DELETE') {
            return supertestWithoutAuth
              .delete(route.path)
              .set('kbn-xsrf', 'xx')
              .auth(scenario.user.username, scenario.user.password)
              .expect(expectFn);
          } else if (route.method === 'POST') {
            await supertestWithoutAuth
              .post(route.path)
              .set('kbn-xsrf', 'xx')
              .auth(scenario.user.username, scenario.user.password)
              .send(route.send)
              .expect(expectFn);
          } else {
            throw new Error('not implemented');
          }
        });
      }
    });
  }
}
