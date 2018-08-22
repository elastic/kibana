/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SPACES } from '../lib/spaces';
import { getUrlPrefix } from '../lib/space_test_utils';
import { AUTHENTICATION } from '../lib/authentication';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('select', () => {

    const expectDefaultSpaceResponse = (resp) => {
      expect(resp.body).to.eql({
        location: `/app/kibana`
      });
    };

    const createExpectSpaceResponse = (spaceId) => (resp) => {
      expect(resp.body).to.eql({
        location: `/s/${spaceId}/app/kibana`
      });
    };

    const createExpectRbacForbidden = (action, spaceId) => (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unauthorized to ${action} ${spaceId} space`
      });
    };

    const createExpectLegacyForbidden = (username) => (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        // eslint-disable-next-line max-len
        message: `action [indices:data/read/get] is unauthorized for user [${username}]: [security_exception] action [indices:data/read/get] is unauthorized for user [${username}]`
      });
    };

    const selectTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        describe('default space', () => {
          it(`should return ${tests.default.statusCode}`, async () => {
            return supertest
              .post(`${getUrlPrefix(SPACES.DEFAULT.spaceId)}/api/spaces/v1/space/${SPACES.DEFAULT.spaceId}/select`)
              .auth(auth.username, auth.password)
              .expect(tests.default.statusCode)
              .then(tests.default.response);
          });
        });

        describe('space_2 from space_1', () => {
          it(`should return ${tests.space2FromSpace1.statusCode}`, async () => {
            return supertest
              .post(`${getUrlPrefix(SPACES.SPACE_1.spaceId)}/api/spaces/v1/space/${SPACES.SPACE_2.spaceId}/select`)
              .auth(auth.username, auth.password)
              .expect(tests.space2FromSpace1.statusCode)
              .then(tests.space2FromSpace1.response);
          });
        });
      });
    };

    selectTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
        space2FromSpace1: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
      }
    });

    selectTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest('kibana rbac default space user', {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
        space2FromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('get', SPACES.SPACE_2.spaceId),
        },
      }
    });

    selectTest('kibana rbac space 1 readonly user', {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden('get', SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('get', SPACES.SPACE_2.spaceId),
        },
      }
    });
  });
}
