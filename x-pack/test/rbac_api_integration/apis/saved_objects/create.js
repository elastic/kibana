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

  describe('create', () => {
    const expectResults = (resp) => {
      expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

      // loose ISO8601 UTC time with milliseconds validation
      expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

      expect(resp.body).to.eql({
        id: resp.body.id,
        type: 'visualization',
        updated_at: resp.body.updated_at,
        version: 1,
        attributes: {
          title: 'My favorite vis'
        }
      });
    };

    const expectForbidden = (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Unable to create visualization, missing action:saved-objects/visualization/create'
      });
    };

    const expectIndexCreated = async (indexCreated) => {
      expect(await es.indices.exists({ index: '.kibana' }))
        .to.be(indexCreated);
    };

    const createTest = (description, { auth, assert }) => {
      describe(description, () => {
        describe('with kibana index', () => {
          before(() => esArchiver.load('saved_objects/basic'));
          after(() => esArchiver.unload('saved_objects/basic'));
          it(`should return ${assert.withIndex.statusCode}`, async () => {
            await supertest
              .post(`/api/saved_objects/visualization`)
              .auth(auth.username, auth.password)
              .send({
                attributes: {
                  title: 'My favorite vis'
                }
              })
              .expect(assert.withIndex.statusCode)
              .then(assert.withIndex.response);
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

          const statusCode = assert.withoutIndex.statusCode;
          const indexCreated = assert.withoutIndex.indexCreated;
          it(`should return ${statusCode} and ${ indexCreated ? 'create' : 'not create'} the kibana index`, async () => {
            await supertest
              .post(`/api/saved_objects/visualization`)
              .auth(auth.username, auth.password)
              .send({
                attributes: {
                  title: 'My favorite vis'
                }
              })
              .expect(assert.withoutIndex.statusCode)
              .then(assert.withoutIndex.response);

            await expectIndexCreated(assert.withoutIndex.indexCreated);
          });
        });
      });
    };

    createTest(`superuser`, {
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
          response: expectResults,
          indexCreated: true
        }
      }
    });

    createTest(`kibana rbac user`, {
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
          response: expectResults,
          indexCreated: true
        }
      }
    });

    createTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          statusCode: 403,
          response: expectForbidden,
        },
        withoutIndex: {
          statusCode: 403,
          response: expectForbidden,
          indexCreated: false
        }
      }
    });
  });
}
