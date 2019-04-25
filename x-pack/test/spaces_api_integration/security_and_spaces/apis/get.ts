/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { getTestSuiteFactory } from '../../common/suites/get';

// eslint-disable-next-line import/no-default-export
export default function getSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    getTest,
    createExpectResults,
    createExpectNotFoundResult,
    createExpectRbacForbidden,
    nonExistantSpaceId,
  } = getTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('get', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        otherSpaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          allAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      getTest(`user with no access`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          default: {
            statusCode: 403,
            response: createExpectRbacForbidden(scenario.spaceId),
          },
        },
      });

      getTest(`superuser`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.superuser,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with all globally`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`dual-privileges user`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`legacy user`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          default: {
            statusCode: 403,
            response: createExpectRbacForbidden(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with read globally`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`dual-privileges readonly user`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with read at space from the ${scenario.spaceId} space`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        user: scenario.users.readAtSpace,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(
        `rbac user with all at other space from the ${scenario.otherSpaceId} getting the ${
          scenario.spaceId
        }`,
        {
          currentSpaceId: scenario.otherSpaceId,
          spaceId: scenario.spaceId,
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

    describe('non-existant space', () => {
      [
        {
          spaceId: SPACES.DEFAULT.spaceId,
          otherSpaceId: nonExistantSpaceId,
          users: {
            allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
            readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
            allAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
            legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
            dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
            dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
          },
        },
      ].forEach(scenario => {
        getTest(`rbac user with all globally`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          user: scenario.users.allGlobally,
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`dual-privileges user`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          user: scenario.users.dualAll,
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`legacy user`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          user: scenario.users.legacyAll,
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.otherSpaceId),
            },
          },
        });

        getTest(`rbac user with read globally`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          user: scenario.users.readGlobally,
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`dual-privileges readonly user`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          user: scenario.users.dualRead,
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`rbac user with all at default space`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          user: scenario.users.allAtDefaultSpace,
          tests: {
            default: {
              statusCode: 403,
              response: createExpectRbacForbidden(scenario.otherSpaceId),
            },
          },
        });
      });
    });
  });
}
