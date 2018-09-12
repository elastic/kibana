/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { getTestSuiteFactory } from '../../common/suites/get';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    createExpectDoesntExistNotFound,
    createExpectLegacyForbidden,
    createExpectSpaceAwareResults,
    createExpectNotSpaceAwareResults,
    getTest,
  } = getTestSuiteFactory(esArchiver, supertest);

  describe('get', () => {
    getTest(`not a kibana user`, {
      auth: {
        username: AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME,
        password: AUTHENTICATION.NOT_A_KIBANA_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
      },
    });

    getTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana legacy dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    getTest(`kibana rbac default space all user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.USERNAME
          ),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.USERNAME
          ),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.USERNAME
          ),
        },
      },
    });

    getTest(`kibana rbac default space read user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.USERNAME
          ),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.USERNAME
          ),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.USERNAME
          ),
        },
      },
    });

    getTest(`kibana rbac space 1 all user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.USERNAME
          ),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.USERNAME
          ),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.USERNAME
          ),
        },
      },
    });

    getTest(`kibana rbac space 1 readonly user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.USERNAME
          ),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.USERNAME
          ),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.USERNAME
          ),
        },
      },
    });
  });
}
