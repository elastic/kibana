/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { AUTHENTICATION } from './authentication';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    const expectResults = resp => {
      // loose uuid validation
      expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

      // loose ISO8601 UTC time with milliseconds validation
      expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

      expect(resp.body).to.eql({
        id: resp.body.id,
        type: 'visualization',
        updated_at: resp.body.updated_at,
        version: 2,
        attributes: {
          title: 'My second favorite vis'
        }
      });
    };

    const expectNotFound = resp => {
      expect(resp.body).eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      });
    };

    const createExpectForbidden = canLogin => resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to update visualization, missing ${canLogin ? '' : 'action:login,'}action:saved_objects/visualization/update`
      });
    };

    const updateTest = (description, { auth, assert }) => {
      describe(description, () => {
        describe('with kibana index', () => {
          before(() => esArchiver.load('saved_objects/basic'));
          after(() => esArchiver.unload('saved_objects/basic'));
          it('should return 200', async () => {
            await supertest
              .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
              .auth(auth.username, auth.password)
              .send({
                attributes: {
                  title: 'My second favorite vis'
                }
              })
              .expect(assert.withIndex.exists.statusCode)
              .then(assert.withIndex.exists.response);
          });

          describe('unknown id', () => {
            it('should return a generic 404', async () => {
              await supertest
                .put(`/api/saved_objects/visualization/not an id`)
                .auth(auth.username, auth.password)
                .send({
                  attributes: {
                    title: 'My second favorite vis'
                  }
                })
                .expect(assert.withIndex.doesntExist.statusCode)
                .then(assert.withIndex.doesntExist.response);
            });
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

          it('should return generic 404', async () => (
            await supertest
              .put(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
              .auth(auth.username, auth.password)
              .send({
                attributes: {
                  title: 'My second favorite vis'
                }
              })
              .expect(assert.withoutIndex.statusCode)
              .then(assert.withoutIndex.response)
          ));
        });
      });
    };

    updateTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          exists: {
            statusCode: 403,
            response: createExpectForbidden(false),
          },
          doesntExist: {
            statusCode: 403,
            response: createExpectForbidden(false),
          },
        },
        withoutIndex: {
          statusCode: 403,
          response: createExpectForbidden(false),
        }
      }
    });

    updateTest(`superuser`, {
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

    updateTest(`kibana rbac user`, {
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

    updateTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          exists: {
            statusCode: 403,
            response: createExpectForbidden(true),
          },
          doesntExist: {
            statusCode: 403,
            response: createExpectForbidden(true),
          },
        },
        withoutIndex: {
          statusCode: 403,
          response: createExpectForbidden(true),
        }
      }
    });

  });
}
