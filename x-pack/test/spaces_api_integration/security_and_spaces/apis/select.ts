/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { selectTestSuiteFactory } from '../../common/suites/select';

// eslint-disable-next-line import/no-default-export
export default function selectSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    selectTest,
    nonExistantSpaceId,
    createExpectSpaceResponse,
    createExpectRbacForbidden,
    createExpectNotFoundResult,
  } = selectTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('select', () => {
    // Tests with users that have privileges globally in Kibana
    [
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        selectSpaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
      {
        currentSpaceId: SPACES.SPACE_1.spaceId,
        selectSpaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      selectTest(
        `user with no access selects ${scenario.selectSpaceId} space from the ${
          scenario.currentSpaceId
        } space`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.noAccess,
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `superuser selects ${scenario.selectSpaceId} space from the ${
          scenario.currentSpaceId
        } space`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.superuser,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `rbac user with all globally selects ${scenario.selectSpaceId} space from the ${
          scenario.currentSpaceId
        } space`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.allGlobally,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `dual-privileges user selects ${scenario.selectSpaceId} space from the ${
          scenario.currentSpaceId
        }`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.dualAll,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `legacy user selects ${scenario.selectSpaceId} space from the ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.legacyAll,
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `user with read globally selects ${scenario.selectSpaceId} space from the
        ${scenario.currentSpaceId} space`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.readGlobally,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `dual-privileges readonly user selects ${scenario.selectSpaceId} space from
        the ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.dualRead,
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
        `rbac user with all at space can select ${scenario.spaceId}
        from the same space`,
        {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.spaceId,
          user: scenario.users.allAtSpace,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.spaceId),
            },
          },
        }
      );

      selectTest(
        `rbac user with read at space can select ${scenario.spaceId}
        from the same space`,
        {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.spaceId,
          user: scenario.users.readAtSpace,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.spaceId),
            },
          },
        }
      );

      selectTest(
        `rbac user with all at other space cannot select ${scenario.spaceId}
        from the same space`,
        {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.spaceId,
          user: scenario.users.allAtOtherSpace,
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
        `rbac user with all at ${scenario.selectSpaceId} can select ${scenario.selectSpaceId}
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.userWithAllAtSpace,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `rbac user with all at both spaces can select ${scenario.selectSpaceId}
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.userWithAllAtBothSpaces,
          tests: {
            default: {
              statusCode: 200,
              response: createExpectSpaceResponse(scenario.selectSpaceId),
            },
          },
        }
      );

      selectTest(
        `rbac user with all at ${scenario.currentSpaceId} space cannot select ${
          scenario.selectSpaceId
        }
        from ${scenario.currentSpaceId}`,
        {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.userWithAllAtOtherSpace,
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
        selectTest(`rbac user with all globally cannot access non-existent space`, {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.userWithAllGlobally,
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        selectTest(`rbac user with all at space cannot access non-existent space`, {
          currentSpaceId: scenario.currentSpaceId,
          selectSpaceId: scenario.selectSpaceId,
          user: scenario.users.userWithAllAtSpace,
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.selectSpaceId),
            },
          },
        });
      });
    });
  });
}
