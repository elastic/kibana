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

  describe('delete', () => {

    const expectEmpty = (resp) => {
      expect(resp.body).to.eql({});
    };

    const expectNotFound = (resp) => {
      expect(resp.body).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'Saved object [dashboard/not-a-real-id] not found'
      });
    };

    const expectRbacForbidden = resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to delete dashboard, missing action:saved_objects/dashboard/delete`
      });
    };

    const createExpectLegacyForbidden = username => resp => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        //eslint-disable-next-line max-len
        message: `action [indices:data/write/delete] is unauthorized for user [${username}]: [security_exception] action [indices:data/write/delete] is unauthorized for user [${username}]`
      });
    };

    const deleteTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/basic'));
        after(() => esArchiver.unload('saved_objects/basic'));

        it(`should return ${tests.actualId.statusCode} when deleting a doc`, async () => (
          await supertest
            .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
            .auth(auth.username, auth.password)
            .expect(tests.actualId.statusCode)
            .then(tests.actualId.response)
        ));

        it(`should return ${tests.invalidId.statusCode} when deleting an unknown doc`, async () => (
          await supertest
            .delete(`/api/saved_objects/dashboard/not-a-real-id`)
            .auth(auth.username, auth.password)
            .expect(tests.invalidId.statusCode)
            .then(tests.invalidId.response)
        ));
      });
    };

    deleteTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        invalidId: {
          statusCode: 403,
          response: expectRbacForbidden,
        }
      }
    });

    deleteTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    deleteTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    deleteTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
        },
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
        }
      }
    });

    deleteTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: expectNotFound,
        }
      }
    });

    deleteTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        invalidId: {
          statusCode: 403,
          response: expectRbacForbidden,
        }
      }
    });

    deleteTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        actualId: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
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
      tests: {
        actualId: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        invalidId: {
          statusCode: 403,
          response: expectRbacForbidden,
        }
      }
    });
  });
}
