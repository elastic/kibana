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

  describe('get', () => {

    const expectResults = (resp) => {
      expect(resp.body).to.eql({
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        type: 'visualization',
        updated_at: '2017-09-21T18:51:23.794Z',
        version: resp.body.version,
        attributes: {
          title: 'Count of requests',
          description: '',
          version: 1,
          // cheat for some of the more complex attributes
          visState: resp.body.attributes.visState,
          uiStateJSON: resp.body.attributes.uiStateJSON,
          kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta
        }
      });
    };

    const expectNotFound = (resp) => {
      expect(resp.body).to.eql({
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404,
      });
    };

    const getTest = (description, { auth, assert }) => {
      describe('with kibana index', () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it('should return 200', async () => (
          await supertest
            .get(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
            .auth(auth.username, auth.password)
            .expect(assert.withIndex.exists.statusCode)
            .then(assert.withIndex.exists.response)
        ));

        describe('doc does not exist', () => {
          it('should return same generic error as when index does not exist', async () => (
            await supertest
              .get(`/api/saved_objects/visualization/foobar`)
              .auth(auth.username, auth.password)
              .expect(assert.withIndex.doesntExist.statusCode)
              .then(assert.withIndex.doesntExist.response)
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

        it('should return basic 404 without mentioning index', async () => (
          await supertest
            .get('/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab')
            .auth(auth.username, auth.password)
            .expect(assert.withoutIndex.statusCode)
            .then(assert.withoutIndex.response)
        ));
      });
    };

    getTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      assert: {
        withIndex: {
          exists: {
            statusCode: 200,
            response: expectResults,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
        withoutIndex: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    getTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          exists: {
            statusCode: 200,
            response: expectResults,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
        withoutIndex: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    getTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          exists: {
            statusCode: 200,
            response: expectResults,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
        withoutIndex: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });
  });
}
