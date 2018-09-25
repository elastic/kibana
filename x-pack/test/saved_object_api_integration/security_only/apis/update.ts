/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { updateTestSuiteFactory } from '../../common/suites/update';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    const {
      createExpectDoesntExistNotFound,
      createExpectLegacyForbidden,
      expectDoesntExistRbacForbidden,
      expectNotSpaceAwareResults,
      expectNotSpaceAwareRbacForbidden,
      expectSpaceAwareRbacForbidden,
      expectSpaceAwareResults,
      updateTest,
    } = updateTestSuiteFactory(esArchiver, supertest);

    updateTest(`user with no access`, {
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

    updateTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`legacy readonly user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME
          ),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME
          ),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME
          ),
        },
      },
    });

    updateTest(`dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`dual-privileges readonly user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with all globally`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`rbac user with read globally`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with all at default space`, {
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

    updateTest(`rbac user with read at default space`, {
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

    updateTest(`rbac user with all at space_1`, {
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

    updateTest(`rbac user with read at space_1`, {
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
