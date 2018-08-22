/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getUrlPrefix } from '../lib/space_test_utils';
import { AUTHENTICATION } from '../lib/authentication';
import { SPACES } from '../../../spaces_api_integration/apis/lib/spaces';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('update', () => {

    const fromDefaultSpaceSpace = {
      id: 'space_1',
      name: 'space 1'
    };
    const expectFromDefaultSpaceResult = resp => {
      expect(resp.body).to.eql(fromDefaultSpaceSpace);
    };

    const fromSpace1Space = {
      id: 'space_2',
      name: 'space 2'
    };
    const expectFromSpace1Result = resp => {
      expect(resp.body).to.eql(fromSpace1Space);
    };

    const createExpectRbacForbidden = (action) => (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unauthorized to ${action} spaces`
      });
    };

    const createExpectLegacyForbidden = (username) => (resp) => {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        // eslint-disable-next-line max-len
        message: `action [indices:data/write/update] is unauthorized for user [${username}]: [security_exception] action [indices:data/write/update] is unauthorized for user [${username}]`
      });
    };

    const updateTest = (description, { auth, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        describe('from the default space', () => {
          it(`should return ${tests.fromDefaultSpace.statusCode}`, async () => {
            return supertest
              .put(`${getUrlPrefix(SPACES.DEFAULT.spaceId)}/api/spaces/v1/space/${fromDefaultSpaceSpace.id}`)
              .auth(auth.username, auth.password)
              .send(fromDefaultSpaceSpace)
              .expect(tests.fromDefaultSpace.statusCode)
              .then(tests.fromDefaultSpace.response);
          });
        });

        describe('from space_1', () => {
          it(`should return ${tests.fromSpace1.statusCode}`, async () => {
            return supertest
              .put(`${getUrlPrefix(SPACES.SPACE_1.spaceId)}/api/spaces/v1/space/${fromSpace1Space.id}`)
              .auth(auth.username, auth.password)
              .send(fromSpace1Space)
              .expect(tests.fromSpace1.statusCode)
              .then(tests.fromSpace1.response);
          });
        });
      });
    };

    updateTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
        fromSpace1: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
      }
    });

    updateTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 200,
          response: expectFromDefaultSpaceResult,
        },
        fromSpace1: {
          statusCode: 200,
          response: expectFromSpace1Result,
        },
      }
    });

    updateTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 200,
          response: expectFromDefaultSpaceResult,
        },
        fromSpace1: {
          statusCode: 200,
          response: expectFromSpace1Result,
        },
      }
    });

    updateTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
        },
        fromSpace1: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME),
        },
      }
    });

    updateTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 200,
          response: expectFromDefaultSpaceResult,
        },
        fromSpace1: {
          statusCode: 200,
          response: expectFromSpace1Result,
        },
      }
    });

    updateTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
        fromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
      }
    });

    updateTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 200,
          response: expectFromDefaultSpaceResult,
        },
        fromSpace1: {
          statusCode: 200,
          response: expectFromSpace1Result,
        },
      }
    });

    updateTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
        fromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
      }
    });

    updateTest('kibana rbac default space user', {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
        fromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
      }
    });

    updateTest('kibana rbac space 1 readonly user', {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READONLY_USER.PASSWORD,
      },
      tests: {
        fromDefaultSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
        fromSpace1: {
          statusCode: 403,
          response: createExpectRbacForbidden('update'),
        },
      }
    });
  });
}
