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
        message: 'Saved object [visualization/foobar] not found',
        statusCode: 404,
      });
    };

    const expectRbacForbidden = resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to get visualization, missing action:saved_objects/visualization/get`
      });
    };

    const getTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it(`should return ${tests.exists.statusCode}`, async () => (
          await supertest
            .get(`/api/saved_objects/visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab`)
            .auth(auth.username, auth.password)
            .expect(tests.exists.statusCode)
            .then(tests.exists.response)
        ));

        describe('document does not exist', () => {
          it(`should return ${tests.doesntExist.statusCode}`, async () => (
            await supertest
              .get(`/api/saved_objects/visualization/foobar`)
              .auth(auth.username, auth.password)
              .expect(tests.doesntExist.statusCode)
              .then(tests.doesntExist.response)
          ));
        });
      });
    };

    getTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      }
    });

    getTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    getTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    getTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    getTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    getTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    getTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    getTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });
  });
}
