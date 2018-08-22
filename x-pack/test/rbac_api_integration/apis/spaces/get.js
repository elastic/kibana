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

  describe('get', () => {

    const allSpaces = [
      { id: 'default',
        name: 'Default Space',
        description: 'This is the default space',
        _reserved: true },
      { id: 'space_1',
        name: 'Space 1',
        description: 'This is the first test space' },
      { id: 'space_2',
        name: 'Space 2',
        description: 'This is the second test space' }
    ];

    const createExpectResultSpace = (spaceId) => (resp) => {
      const result = allSpaces.find(space => space.id === spaceId);
      expect(resp.body).to.eql(result);
    };

    const createExpectRbacForbidden = (action, spaceId) => (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unauthorized to ${action} ${spaceId} space`
      });
    };

    const createExpectLegacyForbidden = username => (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        // eslint-disable-next-line max-len
        message: `action [indices:data/read/get] is unauthorized for user [${username}]: [security_exception] action [indices:data/read/get] is unauthorized for user [${username}]`
      });
    };

    const getTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        describe('default space', () => {
          it(`should return ${tests.default.statusCode}`, async () => {
            return supertest
              .get(`${getUrlPrefix(SPACES.DEFAULT.spaceId)}/api/spaces/v1/space/${SPACES.DEFAULT.spaceId}`)
              .auth(auth.username, auth.password)
              .expect(tests.default.statusCode)
              .then(tests.default.response);
          });
        });

        describe('space_2 from space_1', () => {
          it(`should return ${tests.space2FromSpace1.statusCode}`, async () => {
            return supertest
              .get(`${getUrlPrefix(SPACES.SPACE_1.spaceId)}/api/spaces/v1/space/${SPACES.SPACE_2.spaceId}`)
              .auth(auth.username, auth.password)
              .expect(tests.space2FromSpace1.statusCode)
              .then(tests.space2FromSpace1.response);
          });
        });
      });
    };

    getTest(`not a kibana user`, {
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

    getTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest('kibana rbac default space user', {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.PASSWORD,
      },
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
        space2FromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('get', SPACES.SPACE_2.spaceId),
        },
      }
    });

    getTest('kibana rbac space 1 readonly user', {
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
