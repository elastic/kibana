/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { updateTestSuiteFactory } from '../../common/suites/update';

// eslint-disable-next-line import/no-default-export
export default function updateSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    updateTest,
    expectNotFound,
    expectAlreadyExistsResult,
    expectDefaultSpaceResult,
    expectRbacForbidden,
  } = updateTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('update', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      updateTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`superuser from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.superuser,
        tests: {
          alreadyExists: {
            statusCode: 200,
            response: expectAlreadyExistsResult,
          },
          defaultSpace: {
            statusCode: 200,
            response: expectDefaultSpaceResult,
          },
          newSpace: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });

      updateTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
        tests: {
          alreadyExists: {
            statusCode: 200,
            response: expectAlreadyExistsResult,
          },
          defaultSpace: {
            statusCode: 200,
            response: expectDefaultSpaceResult,
          },
          newSpace: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });

      updateTest(`dual-privileges used from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
        tests: {
          alreadyExists: {
            statusCode: 200,
            response: expectAlreadyExistsResult,
          },
          defaultSpace: {
            statusCode: 200,
            response: expectDefaultSpaceResult,
          },
          newSpace: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });

      updateTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with read globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      updateTest(`rbac user with read at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readAtSpace,
        tests: {
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          defaultSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          newSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });
    });
  });
}
