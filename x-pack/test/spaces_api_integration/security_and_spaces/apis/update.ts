/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { updateTestSuiteFactory } from '../../common/suites/update';

// tslint:disable:no-default-export
export default function updateSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    updateTest,
    expectNewSpaceNotFound,
    expectAlreadyExistsResult,
    expectDefaultSpaceResult,
    expectRbacForbidden,
    createExpectLegacyForbidden,
  } = updateTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('update', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithReadAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
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
        userWithReadAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userWithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
    ].forEach(scenario => {
      updateTest(
        `${scenario.notAKibanaUser.USERNAME} can't update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.notAKibanaUser.USERNAME,
            password: scenario.notAKibanaUser.PASSWORD,
          },
          tests: {
            alreadyExists: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.notAKibanaUser.USERNAME),
            },
            defaultSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.notAKibanaUser.USERNAME),
            },
            newSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.notAKibanaUser.USERNAME),
            },
          },
        }
      );

      updateTest(
        `${scenario.superuser.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.superuser.USERNAME,
            password: scenario.superuser.PASSWORD,
          },
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
              response: expectNewSpaceNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.userWithAllGlobally.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllGlobally.USERNAME,
            password: scenario.userWithAllGlobally.PASSWORD,
          },
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
              response: expectNewSpaceNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.userWithDualAll.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithDualAll.USERNAME,
            password: scenario.userWithDualAll.PASSWORD,
          },
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
              response: expectNewSpaceNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.userWithLegacyAll.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithLegacyAll.USERNAME,
            password: scenario.userWithLegacyAll.PASSWORD,
          },
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
              response: expectNewSpaceNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.userWithReadGlobally.USERNAME} cannot update space_1
        from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithReadGlobally.USERNAME,
            password: scenario.userWithReadGlobally.PASSWORD,
          },
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
        }
      );

      updateTest(
        `${scenario.userWithDualRead.USERNAME} cannot update space_1
        from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithDualRead.USERNAME,
            password: scenario.userWithDualRead.PASSWORD,
          },
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
        }
      );

      updateTest(
        `${scenario.userWithLegacyRead.USERNAME} cannot update space_1
        from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithLegacyRead.USERNAME,
            password: scenario.userWithLegacyRead.PASSWORD,
          },
          tests: {
            alreadyExists: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.userWithLegacyRead.USERNAME),
            },
            defaultSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.userWithLegacyRead.USERNAME),
            },
            newSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.userWithLegacyRead.USERNAME),
            },
          },
        }
      );

      updateTest(`${scenario.userWithAllAtSpace.USERNAME} cannot update space_1`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithAllAtSpace.USERNAME,
          password: scenario.userWithAllAtSpace.PASSWORD,
        },
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

      updateTest(`${scenario.userWithReadAtSpace.USERNAME} cannot update space_1`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithReadAtSpace.USERNAME,
          password: scenario.userWithReadAtSpace.PASSWORD,
        },
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
