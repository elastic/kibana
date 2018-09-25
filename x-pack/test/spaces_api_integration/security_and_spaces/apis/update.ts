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
    expectNotFound,
    expectAlreadyExistsResult,
    expectDefaultSpaceResult,
    expectRbacForbidden,
    createExpectLegacyForbidden,
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
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      updateTest(
        `${scenario.users.noAccess.USERNAME} can't update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.noAccess.USERNAME,
            password: scenario.users.noAccess.PASSWORD,
          },
          tests: {
            alreadyExists: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
            },
            defaultSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
            },
            newSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
            },
          },
        }
      );

      updateTest(
        `${scenario.users.superuser.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.superuser.USERNAME,
            password: scenario.users.superuser.PASSWORD,
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
              response: expectNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.users.allGlobally.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.allGlobally.USERNAME,
            password: scenario.users.allGlobally.PASSWORD,
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
              response: expectNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.users.dualAll.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.dualAll.USERNAME,
            password: scenario.users.dualAll.PASSWORD,
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
              response: expectNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.users.legacyAll.USERNAME} can update space_1 from
        the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.legacyAll.USERNAME,
            password: scenario.users.legacyAll.PASSWORD,
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
              response: expectNotFound,
            },
          },
        }
      );

      updateTest(
        `${scenario.users.readGlobally.USERNAME} cannot update space_1
        from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.readGlobally.USERNAME,
            password: scenario.users.readGlobally.PASSWORD,
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
        `${scenario.users.dualRead.USERNAME} cannot update space_1
        from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.dualRead.USERNAME,
            password: scenario.users.dualRead.PASSWORD,
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
        `${scenario.users.legacyRead.USERNAME} cannot update space_1
        from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.legacyRead.USERNAME,
            password: scenario.users.legacyRead.PASSWORD,
          },
          tests: {
            alreadyExists: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.legacyRead.USERNAME),
            },
            defaultSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.legacyRead.USERNAME),
            },
            newSpace: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.legacyRead.USERNAME),
            },
          },
        }
      );

      updateTest(`${scenario.users.allAtSpace.USERNAME} cannot update space_1`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.allAtSpace.USERNAME,
          password: scenario.users.allAtSpace.PASSWORD,
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

      updateTest(`${scenario.users.readAtSpace.USERNAME} cannot update space_1`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.readAtSpace.USERNAME,
          password: scenario.users.readAtSpace.PASSWORD,
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
