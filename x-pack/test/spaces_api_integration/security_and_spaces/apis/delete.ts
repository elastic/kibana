/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { deleteTestSuiteFactory } from '../../common/suites/delete';

// eslint-disable-next-line import/no-default-export
export default function deleteSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const {
    deleteTest,
    expectRbacForbidden,
    expectEmptyResult,
    expectNotFound,
    expectReservedSpaceResult,
  } = deleteTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('delete', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
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
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach((scenario) => {
      deleteTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`superuser from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.superuser,
        tests: {
          exists: {
            statusCode: 204,
            response: expectEmptyResult,
          },
          reservedSpace: {
            statusCode: 400,
            response: expectReservedSpaceResult,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });

      deleteTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
        tests: {
          exists: {
            statusCode: 204,
            response: expectEmptyResult,
          },
          reservedSpace: {
            statusCode: 400,
            response: expectReservedSpaceResult,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });

      deleteTest(`dual-privileges user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
        tests: {
          exists: {
            statusCode: 204,
            response: expectEmptyResult,
          },
          reservedSpace: {
            statusCode: 400,
            response: expectReservedSpaceResult,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });

      deleteTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`rbac user with read globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      deleteTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          reservedSpace: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });
    });
  });
}
