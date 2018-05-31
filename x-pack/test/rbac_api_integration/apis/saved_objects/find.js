/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { AUTHENTICATION } from './authentication';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('find', () => {

    const expectResults = (resp) => {
      expect(resp.body).to.eql({
        page: 1,
        per_page: 20,
        total: 1,
        saved_objects: [
          {
            type: 'visualization',
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            version: 1,
            attributes: {
              'title': 'Count of requests'
            }
          }
        ]
      });
    };

    const createExpectEmpty = (page, perPage, total) => (resp) => {
      expect(resp.body).to.eql({
        page: page,
        per_page: perPage,
        total: total,
        saved_objects: []
      });
    };

    const findTest = (description, { auth, assert }) => {
      describe('with kibana index', () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it(`should return ${assert.withIndex.normal.statusCode} with individual responses`, async () => (
          await supertest
            .get('/api/saved_objects/_find?type=visualization&fields=title')
            .auth(auth.username, auth.password)
            .expect(assert.withIndex.normal.statusCode)
            .then(assert.withIndex.normal.response)
        ));

        describe('unknown type', () => {
          it(`should return ${assert.withIndex.unknownType.statusCode} with empty response`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=wigwags')
              .auth(auth.username, auth.password)
              .expect(assert.withIndex.unknownType.statusCode)
              .then(assert.withIndex.unknownType.response)
          ));
        });

        describe('page beyond total', () => {
          it(`should return ${assert.withIndex.pageBeyondTotal.statusCode} with empty response`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
              .auth(auth.username, auth.password)
              .expect(assert.withIndex.pageBeyondTotal.statusCode)
              .then(assert.withIndex.pageBeyondTotal.response)
          ));
        });

        describe('unknown search field', () => {
          it(`should return ${assert.withIndex.unknownSearchField.statusCode} with empty response`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=wigwags&search_fields=a')
              .auth(auth.username, auth.password)
              .expect(assert.withIndex.unknownSearchField.statusCode)
              .then(assert.withIndex.unknownSearchField.response)
          ));
        });
      });

      describe('without kibana index', () => {
        before(async () => (
          // just in case the kibana server has recreated it
          await es.indices.delete({
            index: '.kibana',
            ignore: [404],
          })
        ));

        it(`should return ${assert.withoutIndex.normal.statusCode} with empty response`, async () => (
          await supertest
            .get('/api/saved_objects/_find?type=visualization')
            .auth(auth.username, auth.password)
            .expect(assert.withoutIndex.normal.statusCode)
            .then(assert.withoutIndex.normal.response)
        ));

        describe('unknown type', () => {
          it(`should return ${assert.withoutIndex.unknownType.statusCode} with empty response`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=wigwags')
              .auth(auth.username, auth.password)
              .expect(assert.withoutIndex.unknownType.statusCode)
              .then(assert.withoutIndex.unknownType.response)
          ));
        });

        describe('page beyond total', () => {
          it(`should return ${assert.withoutIndex.pageBeyondTotal.statusCode} with empty response`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
              .auth(auth.username, auth.password)
              .expect(assert.withoutIndex.pageBeyondTotal.statusCode)
              .then(assert.withoutIndex.pageBeyondTotal.response)
          ));
        });

        describe('unknown search field', () => {
          it(`should return ${assert.withoutIndex.unknownSearchField.statusCode} with empty response`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=wigwags&search_fields=a')
              .auth(auth.username, auth.password)
              .expect(assert.withoutIndex.unknownSearchField.statusCode)
              .then(assert.withoutIndex.unknownSearchField.response)
          ));
        });
      });
    };

    findTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      assert: {
        withIndex: {
          normal: {
            statusCode: 200,
            response: expectResults,
          },
          unknownType: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          pageBeyondTotal: {
            statusCode: 200,
            response: createExpectEmpty(100, 100, 1),
          },
          unknownSearchField: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
        },
        withoutIndex: {
          normal: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          unknownType: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          pageBeyondTotal: {
            statusCode: 200,
            response: createExpectEmpty(100, 100, 0),
          },
          unknownSearchField: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
        },
      }
    });

    findTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          normal: {
            statusCode: 200,
            response: expectResults,
          },
          unknownType: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          pageBeyondTotal: {
            statusCode: 200,
            response: createExpectEmpty(100, 100, 1),
          },
          unknownSearchField: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
        },
        withoutIndex: {
          normal: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          unknownType: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          pageBeyondTotal: {
            statusCode: 200,
            response: createExpectEmpty(100, 100, 0),
          },
          unknownSearchField: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
        },
      }
    });

    findTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          normal: {
            statusCode: 200,
            response: expectResults,
          },
          unknownType: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          pageBeyondTotal: {
            statusCode: 200,
            response: createExpectEmpty(100, 100, 1),
          },
          unknownSearchField: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
        },
        withoutIndex: {
          normal: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          unknownType: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
          pageBeyondTotal: {
            statusCode: 200,
            response: createExpectEmpty(100, 100, 0),
          },
          unknownSearchField: {
            statusCode: 200,
            response: createExpectEmpty(1, 20, 0),
          },
        },
      }
    });
  });
}
