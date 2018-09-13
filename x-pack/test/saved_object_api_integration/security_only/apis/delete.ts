/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { deleteTestSuiteFactory } from '../../common/suites/delete';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('delete', () => {
    const {
      createExpectLegacyForbidden,
      createExpectUnknownDocNotFound,
      deleteTest,
      expectEmpty,
      expectRbacSpaceAwareForbidden,
      expectRbacNotSpaceAwareForbidden,
      expectRbacInvalidIdForbidden,
    } = deleteTestSuiteFactory(esArchiver, supertest);

    deleteTest(`not a kibana user`, {
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
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.USERNAME),
        },
      },
    });

    deleteTest(`superuser`, {
      auth: {
        username: AUTHENTICATION.SUPERUSER.USERNAME,
        password: AUTHENTICATION.SUPERUSER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(),
        },
      },
    });

    deleteTest(`kibana legacy user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_LEGACY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_LEGACY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(),
        },
      },
    });

    deleteTest(`kibana legacy dashboard only user`, {
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
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.USERNAME
          ),
        },
      },
    });

    deleteTest(`kibana dual-privileges user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(),
        },
      },
    });

    deleteTest(`kibana dual-privileges dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectRbacSpaceAwareForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectRbacNotSpaceAwareForbidden,
        },
        invalidId: {
          statusCode: 403,
          response: expectRbacInvalidIdForbidden,
        },
      },
    });

    deleteTest(`kibana rbac user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(),
        },
      },
    });

    deleteTest(`kibana rbac dashboard only user`, {
      auth: {
        username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.USERNAME,
        password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.PASSWORD,
      },
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectRbacSpaceAwareForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectRbacNotSpaceAwareForbidden,
        },
        invalidId: {
          statusCode: 403,
          response: expectRbacInvalidIdForbidden,
        },
      },
    });

    deleteTest(`kibana rbac default space all user`, {
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
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.USERNAME
          ),
        },
      },
    });

    deleteTest(`kibana rbac default space read user`, {
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
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.USERNAME
          ),
        },
      },
    });

    deleteTest(`kibana rbac space 1 all user`, {
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
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.USERNAME
          ),
        },
      },
    });

    deleteTest(`kibana rbac space 1 readonly user`, {
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
        invalidId: {
          statusCode: 403,
          response: createExpectLegacyForbidden(
            AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.USERNAME
          ),
        },
      },
    });
  });
}
