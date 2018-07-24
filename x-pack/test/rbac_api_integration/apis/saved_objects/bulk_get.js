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

    const expectRbacForbidden = resp => {
      //eslint-disable-next-line max-len
      const missingActions = `action:saved_objects/config/bulk_get,action:saved_objects/dashboard/bulk_get,action:saved_objects/visualization/bulk_get`;
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to bulk_get config,dashboard,visualization, missing ${missingActions}`
      });
    };

    const bulkGetTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it(`should return ${tests.default.statusCode}`, async () => {
          await supertest
            .post(`/api/saved_objects/_bulk_get`)
            .auth(auth.username, auth.password)
            .send(BULK_REQUESTS)
            .expect(tests.default.statusCode)
            .then(tests.default.response);
        });
      });
    };

    bulkGetTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        }
      }
    });

    bulkGetTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    bulkGetTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    bulkGetTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    bulkGetTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    bulkGetTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    bulkGetTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    bulkGetTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });
  });
}
