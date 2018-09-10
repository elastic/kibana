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
    expectReservedSpecifiedResult,
    expectNewSpaceResult,
    expectConflictResponse,
    expectRbacForbiddenResponse,
    createExpectLegacyForbiddenResponse,
  } = createTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('create', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userWithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userWithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
    ].forEach(scenario => {
      createTest(`${scenario.notAKibanaUser.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.notAKibanaUser.USERNAME,
          password: scenario.notAKibanaUser.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.notAKibanaUser.USERNAME),
          },
          alreadyExists: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.notAKibanaUser.USERNAME),
          },
          reservedSpecified: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.notAKibanaUser.USERNAME),
          },
        },
      });

      createTest(`${scenario.superuser.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.superuser.USERNAME,
          password: scenario.superuser.PASSWORD,
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

      createTest(`${scenario.userWithAllGlobally.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithAllGlobally.USERNAME,
          password: scenario.userWithAllGlobally.PASSWORD,
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

      createTest(`${scenario.userWithDualAll.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithDualAll.USERNAME,
          password: scenario.userWithDualAll.PASSWORD,
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

      createTest(`${scenario.userWithLegacyAll.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithLegacyAll.USERNAME,
          password: scenario.userWithLegacyAll.PASSWORD,
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

      createTest(`${scenario.userWithReadGlobally.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithReadGlobally.USERNAME,
          password: scenario.userWithReadGlobally.PASSWORD,
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

      createTest(`${scenario.userWithDualRead.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithDualRead.USERNAME,
          password: scenario.userWithDualRead.PASSWORD,
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

      createTest(`${scenario.userWithLegacyRead.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithLegacyRead.USERNAME,
          password: scenario.userWithLegacyRead.PASSWORD,
        },
        tests: {
          newSpace: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.userWithLegacyRead.USERNAME),
          },
          alreadyExists: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.userWithLegacyRead.USERNAME),
          },
          reservedSpecified: {
            statusCode: 403,
            response: createExpectLegacyForbiddenResponse(scenario.userWithLegacyRead.USERNAME),
          },
        },
      });

      createTest(`${scenario.userWithAllAtSpace.USERNAME} within the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithAllAtSpace.USERNAME,
          password: scenario.userWithAllAtSpace.PASSWORD,
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
