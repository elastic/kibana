/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { createTestSuiteFactory } from '../../common/suites/create';

// tslint:disable:no-default-export
export default function createSpacesOnlySuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    expectNewSpaceResult,
    expectReservedSpecifiedResult,
    expectConflictResponse,
    expectRbacForbiddenResponse,
    createExpectLegacyForbiddenResponse,
  } = createTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('create', () => {
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
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
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
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      createTest(`${scenario.users.noAccess.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.noAccess.USERNAME,
          password: scenario.users.noAccess.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.users.noAccess.USERNAME),
          },
          alreadyExists: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.users.noAccess.USERNAME),
          },
          reservedSpecified: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.users.noAccess.USERNAME),
          },
        },
      });

      createTest(`${scenario.users.superuser.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.superuser.USERNAME,
          password: scenario.users.superuser.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 200,
            response: expectNewSpaceResult,
          },
          alreadyExists: {
            statusCode: 409,
            response: expectConflictResponse,
          },
          reservedSpecified: {
            statusCode: 200,
            response: expectReservedSpecifiedResult,
          },
        },
      });

      createTest(`${scenario.users.allGlobally.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.allGlobally.USERNAME,
          password: scenario.users.allGlobally.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 200,
            response: expectNewSpaceResult,
          },
          alreadyExists: {
            statusCode: 409,
            response: expectConflictResponse,
          },
          reservedSpecified: {
            statusCode: 200,
            response: expectReservedSpecifiedResult,
          },
        },
      });

      createTest(`${scenario.users.dualAll.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.dualAll.USERNAME,
          password: scenario.users.dualAll.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 200,
            response: expectNewSpaceResult,
          },
          alreadyExists: {
            statusCode: 409,
            response: expectConflictResponse,
          },
          reservedSpecified: {
            statusCode: 200,
            response: expectReservedSpecifiedResult,
          },
        },
      });

      createTest(`${scenario.users.legacyAll.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.legacyAll.USERNAME,
          password: scenario.users.legacyAll.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 200,
            response: expectNewSpaceResult,
          },
          alreadyExists: {
            statusCode: 409,
            response: expectConflictResponse,
          },
          reservedSpecified: {
            statusCode: 200,
            response: expectReservedSpecifiedResult,
          },
        },
      });

      createTest(`${scenario.users.readGlobally.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.readGlobally.USERNAME,
          password: scenario.users.readGlobally.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });

      createTest(`${scenario.users.dualRead.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.dualRead.USERNAME,
          password: scenario.users.dualRead.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });

      createTest(`${scenario.users.legacyRead.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.legacyRead.USERNAME,
          password: scenario.users.legacyRead.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.users.legacyRead.USERNAME),
          },
          alreadyExists: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.users.legacyRead.USERNAME),
          },
          reservedSpecified: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.users.legacyRead.USERNAME),
          },
        },
      });

      createTest(`${scenario.users.allAtSpace.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.allAtSpace.USERNAME,
          password: scenario.users.allAtSpace.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          alreadyExists: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
          reservedSpecified: {
            statusCode: 403,
            response: expectRbacForbiddenResponse,
          },
        },
      });
    });
  });
}
