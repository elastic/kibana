/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface PrivilegeTestScenario {
  user: {
    username: string;
    password: string;
  };
  expect: number;
}

interface PrivilegeTestRoute {
  method: string;
  path: string;
  send?: any;
  beforeEach?: () => any;
  afterEach?: () => any;
  scenarios: PrivilegeTestScenario[];
}

export function runPrivilegeTests(routes: PrivilegeTestRoute[], supertestWithoutAuth: any) {
  for (const route of routes) {
    describe(`${route.method} ${route.path}`, () => {
      beforeEach(() => {
        return route.beforeEach ? route.beforeEach() : undefined;
      });
      afterEach(() => {
        return route.afterEach ? route.afterEach() : undefined;
      });
      for (const scenario of route.scenarios) {
        it(`should return a ${scenario.expect} for user: ${scenario.user.username}`, async () => {
          if (route.method === 'GET') {
            return supertestWithoutAuth
              .get(route.path)
              .auth(scenario.user.username, scenario.user.password)
              .expect(scenario.expect);
          } else if (route.method === 'PUT') {
            return supertestWithoutAuth
              .put(route.path)
              .set('kbn-xsrf', 'xx')
              .auth(scenario.user.username, scenario.user.password)
              .send(route.send)
              .expect(scenario.expect);
          } else if (route.method === 'DELETE') {
            return supertestWithoutAuth
              .delete(route.path)
              .set('kbn-xsrf', 'xx')
              .auth(scenario.user.username, scenario.user.password)
              .expect(scenario.expect);
          } else if (route.method === 'POST') {
            return supertestWithoutAuth
              .post(route.path)
              .set('kbn-xsrf', 'xx')
              .auth(scenario.user.username, scenario.user.password)
              .send(route.send)
              .expect(scenario.expect);
          } else {
            throw new Error('not implemented');
          }
        });
      }
    });
  }
}
