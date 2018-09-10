/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { selectTestSuiteFactory } from '../../common/suites/select';

// tslint:disable:no-default-export
export default function selectSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    selectTest,
    createExpectSpaceResponse,
    createExpectRbacForbidden,
    createExpectNotFoundResult,
    nonExistantSpaceId,
    createExpectLegacyForbidden,
  } = selectTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('select', () => {
    // Global authorization tests
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        otherSpaceId: SPACES.SPACE_1.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userWithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.DEFAULT.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userWithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
    ].forEach(scenario => {
      selectTest(`${scenario.notAKibanaUser.USERNAME} selects ${scenario.otherSpaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.otherSpaceId,
        auth: {
          username: scenario.notAKibanaUser.USERNAME,
          password: scenario.notAKibanaUser.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 403,
            response: createExpectLegacyForbidden(scenario.notAKibanaUser.USERNAME),
          },
        },
      });

      selectTest(`${scenario.superuser.USERNAME} selects ${scenario.otherSpaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.otherSpaceId,
        auth: {
          username: scenario.superuser.USERNAME,
          password: scenario.superuser.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.otherSpaceId),
          },
        },
      });

      selectTest(`${scenario.userWithAllGlobally.USERNAME} selects ${scenario.otherSpaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.otherSpaceId,
        auth: {
          username: scenario.userWithAllGlobally.USERNAME,
          password: scenario.userWithAllGlobally.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.otherSpaceId),
          },
        },
      });

      selectTest(`${scenario.userWithDualAll.USERNAME} selects ${scenario.otherSpaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.otherSpaceId,
        auth: {
          username: scenario.userWithDualAll.USERNAME,
          password: scenario.userWithDualAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.otherSpaceId),
          },
        },
      });

      selectTest(`${scenario.userWithLegacyAll.USERNAME} selects ${scenario.otherSpaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.otherSpaceId,
        auth: {
          username: scenario.userWithLegacyAll.USERNAME,
          password: scenario.userWithLegacyAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.otherSpaceId),
          },
        },
      });

      selectTest(
        `${scenario.userWithReadGlobally.USERNAME} selects ${scenario.otherSpaceId} from
        ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithReadGlobally.USERNAME,
            password: scenario.userWithReadGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.otherSpaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.userWithDualRead.USERNAME} selects ${scenario.otherSpaceId} from
        ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithDualRead.USERNAME,
            password: scenario.userWithDualRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.otherSpaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.userWithLegacyRead.USERNAME} can select ${scenario.otherSpaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithLegacyRead.USERNAME,
            password: scenario.userWithLegacyRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.otherSpaceId),
            },
          },
        }
      );
    });

    // Same-Space authorization tests
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        userWithReadAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
        userWithAllAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithReadAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
        userWithAllAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      },
    ].forEach(scenario => {
      selectTest(
        `${scenario.userWithAllAtSpace.USERNAME} can select ${scenario.spaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllAtSpace.USERNAME,
            password: scenario.userWithAllAtSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.spaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.userWithReadAtSpace.USERNAME} can select ${scenario.spaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithReadAtSpace.USERNAME,
            password: scenario.userWithReadAtSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.spaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.userWithAllAtOtherSpace.USERNAME} cannot select ${scenario.spaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllAtOtherSpace.USERNAME,
            password: scenario.userWithAllAtOtherSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.spaceId),
            },
          },
        }
      );
    });

    // Cross-Space authorization tests
    [
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.SPACE_2.spaceId,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithAllAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_2_ALL_USER,
        userWithAllAtBothSpaces: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_ALL_USER,
      },
    ].forEach(scenario => {
      selectTest(
        `${scenario.userWithAllAtBothSpaces.USERNAME} can select ${scenario.spaceId}
        from ${scenario.otherSpaceId}`,
        {
          currentSpaceId: scenario.otherSpaceId,
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllAtBothSpaces.USERNAME,
            password: scenario.userWithAllAtBothSpaces.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.spaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.userWithAllAtOtherSpace.USERNAME} cannot select ${scenario.spaceId}
        from ${scenario.otherSpaceId}`,
        {
          currentSpaceId: scenario.otherSpaceId,
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllAtOtherSpace.USERNAME,
            password: scenario.userWithAllAtOtherSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.spaceId),
            },
          },
        }
      );
    });

    describe('non-existant space', () => {
      [
        {
          spaceId: SPACES.DEFAULT.spaceId,
          otherSpaceId: nonExistantSpaceId,
          userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        },
        {
          spaceId: SPACES.SPACE_1.spaceId,
          otherSpaceId: nonExistantSpaceId,
          userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        },
      ].forEach(scenario => {
        selectTest(`${scenario.userWithAllGlobally.USERNAME} cannot access non-existant space`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithAllGlobally.USERNAME,
            password: scenario.userWithAllGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(nonExistantSpaceId),
            },
          },
        });

        selectTest(`${scenario.userWithAllAtSpace.USERNAME} cannot access non-existant space`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithAllAtSpace.USERNAME,
            password: scenario.userWithAllAtSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(nonExistantSpaceId),
            },
          },
        });
      });
    });
  });
}
