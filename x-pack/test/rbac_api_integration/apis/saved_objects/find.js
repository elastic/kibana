/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { AUTHENTICATION } from './lib/authentication';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('find', () => {

    const expectVisualizationResults = (resp) => {
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

    const expectBadRequest = (resp) => {
      expect(resp.body).to.eql({
        error: 'Bad Request',
        message: 'child "type" fails because ["type" is required]',
        statusCode: 400,
        validation: {
          keys: ['type'],
          source: 'query'
        }
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

    const createExpectRbacForbidden = (type) => resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to find ${type}, missing action:saved_objects/${type}/find`
      });
    };

    const findTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it(`should return ${tests.normal.statusCode} with ${tests.normal.description}`, async () => (
          await supertest
            .get('/api/saved_objects/_find?type=visualization&fields=title')
            .auth(auth.username, auth.password)
            .expect(tests.normal.statusCode)
            .then(tests.normal.response)
        ));

        describe('unknown type', () => {
          it(`should return ${tests.unknownType.statusCode} with ${tests.unknownType.description}`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=wigwags')
              .auth(auth.username, auth.password)
              .expect(tests.unknownType.statusCode)
              .then(tests.unknownType.response)
          ));
        });

        describe('page beyond total', () => {
          it(`should return ${tests.pageBeyondTotal.statusCode} with ${tests.pageBeyondTotal.description}`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=visualization&page=100&per_page=100')
              .auth(auth.username, auth.password)
              .expect(tests.pageBeyondTotal.statusCode)
              .then(tests.pageBeyondTotal.response)
          ));
        });

        describe('unknown search field', () => {
          it(`should return ${tests.unknownSearchField.statusCode} with ${tests.unknownSearchField.description}`, async () => (
            await supertest
              .get('/api/saved_objects/_find?type=wigwags&search_fields=a')
              .auth(auth.username, auth.password)
              .expect(tests.unknownSearchField.statusCode)
              .then(tests.unknownSearchField.response)
          ));
        });

        describe('no type', () => {
          it(`should return ${tests.noType.statusCode} with ${tests.noType.description}`, async () => (
            await supertest
              .get('/api/saved_objects/_find')
              .auth(auth.username, auth.password)
              .expect(tests.noType.statusCode)
              .then(tests.noType.response)
          ));
        });
      });
    };

    findTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownType: {
          description: 'forbidden login and find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: `forbidded can't find any types`,
          statusCode: 400,
          response: expectBadRequest,
        }
      }
    });

    findTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      },
    });

    findTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      },
    });

    findTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      }
    });

    findTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      },
    });

    findTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      }
    });

    findTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      },
    });

    findTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults,
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'all objects',
          statusCode: 400,
          response: expectBadRequest,
        },
      }
    });
  });
}
