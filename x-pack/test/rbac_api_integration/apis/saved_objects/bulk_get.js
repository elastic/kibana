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

  const BULK_REQUESTS = [
    {
      type: 'visualization',
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
    },
    {
      type: 'dashboard',
      id: 'does not exist',
    },
    {
      type: 'config',
      id: '7.0.0-alpha1',
    },
  ];

  describe('_bulk_get', () => {
    const expectResults = resp => {
      expect(resp.body).to.eql({
        saved_objects: [
          {
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            type: 'visualization',
            updated_at: '2017-09-21T18:51:23.794Z',
            version: resp.body.saved_objects[0].version,
            attributes: {
              title: 'Count of requests',
              description: '',
              version: 1,
              // cheat for some of the more complex attributes
              visState: resp.body.saved_objects[0].attributes.visState,
              uiStateJSON: resp.body.saved_objects[0].attributes.uiStateJSON,
              kibanaSavedObjectMeta:
                resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta,
            },
          },
          {
            id: 'does not exist',
            type: 'dashboard',
            error: {
              statusCode: 404,
              message: 'Not found',
            },
          },
          {
            id: '7.0.0-alpha1',
            type: 'config',
            updated_at: '2017-09-21T18:49:16.302Z',
            version: resp.body.saved_objects[2].version,
            attributes: {
              buildNum: 8467,
              defaultIndex: '91200a00-9efd-11e7-acb3-3dab96693fab',
            },
          },
        ],
      });
    };

    const expect404s = resp => {
      expect(resp.body).to.eql({
        saved_objects: [
          {
            id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
            type: 'visualization',
            error: {
              statusCode: 404,
              message: 'Not found',
            },
          },
          {
            id: 'does not exist',
            type: 'dashboard',
            error: {
              statusCode: 404,
              message: 'Not found',
            },
          },
          {
            id: '7.0.0-alpha1',
            type: 'config',
            error: {
              statusCode: 404,
              message: 'Not found',
            },
          },
        ],
      });
    };

    const bulkGetTest = (description, { auth, assert }) => {
      describe(description, () => {
        describe('with kibana index', () => {
          before(() => esArchiver.load('saved_objects/basic'));
          after(() => esArchiver.unload('saved_objects/basic'));

          it('should return 200 with individual responses', async () => {
            await supertest
              .post(`/api/saved_objects/_bulk_get`)
              .auth(auth.username, auth.password)
              .send(BULK_REQUESTS)
              .expect(assert.withIndex.statusCode)
              .then(assert.withIndex.response);
          });
        });

        describe('without kibana index', () => {
          before(
            async () =>
              // just in case the kibana server has recreated it
              await es.indices.delete({
                index: '.kibana',
                ignore: [404],
              })
          );

          it('should return 200 with individual responses', async () => {
            await supertest
              .post('/api/saved_objects/_bulk_get')
              .auth(auth.username, auth.password)
              .send(BULK_REQUESTS)
              .expect(assert.withoutIndex.statusCode)
              .then(assert.withoutIndex.response);
          });
        });
      });
    };

    bulkGetTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      assert: {
        withIndex: {
          statusCode: 200,
          response: expectResults,
        },
        withoutIndex: {
          statusCode: 200,
          response: expect404s
        }
      }
    });

    bulkGetTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          statusCode: 200,
          response: expectResults,
        },
        withoutIndex: {
          statusCode: 200,
          response: expect404s
        }
      }
    });

    bulkGetTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          statusCode: 200,
          response: expectResults,
        },
        withoutIndex: {
          statusCode: 200,
          response: expect404s
        }
      }
    });
  });
}
