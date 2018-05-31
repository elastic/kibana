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

  describe('delete', () => {

    const expectEmpty = (resp) => {
      expect(resp.body).to.eql({});
    };

    const expectNotFound = (resp) => {
      expect(resp.body).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      });
    };

    const expectForbidden = (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Unable to delete dashboard, missing action:saved-objects/dashboard/delete'
      });
    };

    const deleteTest = (description, { auth, assert }) => {
      describe(description, () => {
        describe('with kibana index', () => {
          before(() => esArchiver.load('saved_objects/basic'));
          after(() => esArchiver.unload('saved_objects/basic'));

          it(`should return ${assert.withIndex.deletingDoc.statusCode} when deleting a doc`, async () => (
            await supertest
              .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
              .auth(auth.username, auth.password)
              .expect(assert.withIndex.deletingDoc.statusCode)
              .then(assert.withIndex.deletingDoc.response)
          ));

          it(`should return generic ${assert.withIndex.deletingUnknownDoc.statusCode} when deleting an unknown doc`, async () => (
            await supertest
              .delete(`/api/saved_objects/dashboard/not-a-real-id`)
              .auth(auth.username, auth.password)
              .expect(assert.withIndex.deletingUnknownDoc.statusCode)
              .then(assert.withIndex.deletingUnknownDoc.response)
          ));
        });

        describe('without kibana index', () => {
          before(async () => (
            // just in case the kibana server has recreated it
            await es.indices.delete({
              index: '.kibana',
              ignore: [404],
            })
          ));

          it(`returns generic ${assert.withoutIndex.statusCode} when kibana index is missing`, async () => (
            await supertest
              .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
              .auth(auth.username, auth.password)
              .expect(assert.withoutIndex.statusCode)
              .then(assert.withoutIndex.response)
          ));
        });
      });
    };

    deleteTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      assert: {
        withIndex: {
          deletingDoc: {
            statusCode: 200,
            response: expectEmpty,
          },
          deletingUnknownDoc: {
            statusCode: 404,
            resposne: expectNotFound,
          }
        },
        withoutIndex: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    deleteTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          deletingDoc: {
            statusCode: 200,
            response: expectEmpty,
          },
          deletingUnknownDoc: {
            statusCode: 404,
            resposne: expectNotFound,
          }
        },
        withoutIndex: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    deleteTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      assert: {
        withIndex: {
          deletingDoc: {
            statusCode: 403,
            response: expectForbidden,
          },
          deletingUnknownDoc: {
            statusCode: 403,
            response: expectForbidden,
          }
        },
        withoutIndex: {
          statusCode: 403,
          response: expectForbidden,
        }
      }
    });
  });
}
