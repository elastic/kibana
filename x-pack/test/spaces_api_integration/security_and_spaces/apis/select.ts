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
    nonExistantSpaceId,
    createExpectSpaceResponse,
    createExpectRbacForbidden,
    createExpectNotFoundResult,
    createExpectLegacyForbidden,
  } = selectTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe.only('select', () => {
    // Tests with users that have privileges globally in Kibana
    [
      {
        // Select the spaceId with the user in the currentSpaceId with the following users
        currentSpaceId: SPACES.DEFAULT.spaceId,
        selectSpaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
      {
        // Select the spaceId when the user is the currentSpaceId with the following users
        currentSpaceId: SPACES.SPACE_1.spaceId,
        selectSpaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      selectTest(`${scenario.users.noAccess.USERNAME} selects ${scenario.selectSpaceId}`, {
        currentSpaceId: scenario.currentSpaceId,
        selectSpaceId: scenario.selectSpaceId,
        auth: {
          username: scenario.users.noAccess.USERNAME,
          password: scenario.users.noAccess.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 403,
            response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
          },
        },
      });

      selectTest(`${scenario.users.superuser.USERNAME} selects ${scenario.selectSpaceId}`, {
        currentSpaceId: scenario.currentSpaceId,
        selectSpaceId: scenario.selectSpaceId,
        auth: {
          username: scenario.users.superuser.USERNAME,
          password: scenario.users.superuser.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.selectSpaceId),
          },
        },
      });

      selectTest(`${scenario.users.allGlobally.USERNAME} selects ${scenario.selectSpaceId}`, {
        currentSpaceId: scenario.currentSpaceId,
        selectSpaceId: scenario.selectSpaceId,
        auth: {
          username: scenario.users.allGlobally.USERNAME,
          password: scenario.users.allGlobally.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.selectSpaceId),
          },
        },
      });

      selectTest(`${scenario.users.dualAll.USERNAME} selects ${scenario.selectSpaceId}`, {
        currentSpaceId: scenario.currentSpaceId,
        selectSpaceId: scenario.selectSpaceId,
        auth: {
          username: scenario.users.dualAll.USERNAME,
          password: scenario.users.dualAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.selectSpaceId),
          },
        },
      });

      selectTest(`${scenario.users.legacyAll.USERNAME} selects ${scenario.selectSpaceId}`, {
        currentSpaceId: scenario.currentSpaceId,
        selectSpaceId: scenario.selectSpaceId,
        auth: {
          username: scenario.users.legacyAll.USERNAME,
          password: scenario.users.legacyAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.selectSpaceId),
          },
        },
      });

      selectTest(
        `${scenario.users.readGlobally.USERNAME} selects ${scenario.selectSpaceId} from
        ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          auth: {
            username: scenario.users.readGlobally.USERNAME,
            password: scenario.users.readGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.users.dualRead.USERNAME} selects ${scenario.selectSpaceId} from
        ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          auth: {
            username: scenario.users.dualRead.USERNAME,
            password: scenario.users.dualRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.users.legacyRead.USERNAME} can select ${scenario.selectSpaceId}
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          auth: {
            username: scenario.users.legacyRead.USERNAME,
            password: scenario.users.legacyRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );
    });

    // Select the same space that you're currently in with users which have space specific privileges.
    // Our intent is to ensure that you have privileges at the space that you're selecting.
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          allAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        },
      },
    ].forEach(scenario => {
      selectTest(
        `${scenario.users.allAtSpace.USERNAME} can select ${scenario.spaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.spaceId,
          auth: {
            username: scenario.users.allAtSpace.USERNAME,
            password: scenario.users.allAtSpace.PASSWORD,
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
        `${scenario.users.readAtSpace.USERNAME} can select ${scenario.spaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.spaceId,
          auth: {
            username: scenario.users.readAtSpace.USERNAME,
            password: scenario.users.readAtSpace.PASSWORD,
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
        `${scenario.users.allAtOtherSpace.USERNAME} cannot select ${scenario.spaceId}
        from ${scenario.spaceId}`,
        {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.spaceId,
          auth: {
            username: scenario.users.allAtOtherSpace.USERNAME,
            password: scenario.users.allAtOtherSpace.PASSWORD,
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

    // Select a different space with users that only have privileges at certain spaces. Our intent
    // is to ensure that a user can select a space based on their privileges at the space that they're selecting
    // not at the space that they're currently in.
    [
      {
        currentSpaceId: SPACES.SPACE_2.spaceId,
        selectSpaceId: SPACES.SPACE_1.spaceId,
        users: {
          userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          userWithAllAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_2_ALL_USER,
          userWithAllAtBothSpaces: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_ALL_USER,
        },
      },
    ].forEach(scenario => {
      selectTest(
        `${scenario.users.userWithAllAtSpace.USERNAME} can select ${scenario.selectSpaceId}
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          auth: {
            username: scenario.users.userWithAllAtSpace.USERNAME,
            password: scenario.users.userWithAllAtSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.users.userWithAllAtBothSpaces.USERNAME} can select ${scenario.selectSpaceId}
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          auth: {
            username: scenario.users.userWithAllAtBothSpaces.USERNAME,
            password: scenario.users.userWithAllAtBothSpaces.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `${scenario.users.userWithAllAtOtherSpace.USERNAME} cannot select ${scenario.selectSpaceId}
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          auth: {
            username: scenario.users.userWithAllAtOtherSpace.USERNAME,
            password: scenario.users.userWithAllAtOtherSpace.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.selectSpaceId),
            },
          },
        }
      );
    });

    // Select non-existent spaces and ensure we get a 404 or a 403
    describe('non-existent space', () => {
      [
        {
          currentSpaceId: SPACES.DEFAULT.spaceId,
          selectSpaceId: nonExistantSpaceId,
          users: {
            userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
            userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          },
        },
        {
          currentSpaceId: SPACES.SPACE_1.spaceId,
          selectSpaceId: nonExistantSpaceId,
          users: {
            userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
            userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          },
        },
      ].forEach(scenario => {
        selectTest(
          `${scenario.users.userWithAllGlobally.USERNAME} cannot access non-existant space`,
          {
            currentSpaceId: scenario.currentSpaceId,
            selectSpaceId: scenario.selectSpaceId,
            auth: {
              username: scenario.users.userWithAllGlobally.USERNAME,
              password: scenario.users.userWithAllGlobally.PASSWORD,
            },
            tests: {
              default: {
                statusCode: 404,
                response: createExpectNotFoundResult(),
              },
            },
          }
        );

        selectTest(
          `${scenario.users.userWithAllAtSpace.USERNAME} cannot access non-existant space`,
          {
            currentSpaceId: scenario.currentSpaceId,
            selectSpaceId: scenario.selectSpaceId,
            auth: {
              username: scenario.users.userWithAllAtSpace.USERNAME,
              password: scenario.users.userWithAllAtSpace.PASSWORD,
            },
            tests: {
              default: {
                statusCode: 403,
                response: createExpectRbacForbidden(scenario.selectSpaceId),
              },
            },
          }
        );
      });
    });
  });
}
