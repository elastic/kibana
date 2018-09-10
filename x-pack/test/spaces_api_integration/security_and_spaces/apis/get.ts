/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { getTestSuiteFactory } from '../../common/suites/get';

// tslint:disable:no-default-export
export default function getSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    getTest,
    createExpectResults,
    createExpectNotFoundResult,
    createExpectLegacyForbidden,
    createExpectRbacForbidden,
    nonExistantSpaceId,
  } = getTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('get', () => {
    // valid spaces
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        otherSpaceId: SPACES.SPACE_1.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        userWithReadAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
        userWithAllAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userwithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.DEFAULT.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithReadAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
        userWithAllAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userwithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
    ].forEach(scenario => {
      getTest(`${scenario.notAKibanaUser.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
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

      getTest(`${scenario.superuser.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.superuser.USERNAME,
          password: scenario.superuser.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithAllGlobally.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithAllGlobally.USERNAME,
          password: scenario.userWithAllGlobally.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithDualAll.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithDualAll.USERNAME,
          password: scenario.userWithDualAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithLegacyAll.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithLegacyAll.USERNAME,
          password: scenario.userWithLegacyAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithReadGlobally.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithReadGlobally.USERNAME,
          password: scenario.userWithReadGlobally.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userwithDualRead.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userwithDualRead.USERNAME,
          password: scenario.userwithDualRead.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithLegacyRead.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithLegacyRead.USERNAME,
          password: scenario.userWithLegacyRead.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithReadAtSpace.USERNAME} at ${scenario.spaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.userWithReadAtSpace.USERNAME,
          password: scenario.userWithReadAtSpace.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.userWithAllAtOtherSpace.USERNAME} at a different space`, {
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
      });
    });

    describe('non-existant space', () => {
      [
        {
          spaceId: SPACES.DEFAULT.spaceId,
          otherSpaceId: nonExistantSpaceId,
          userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          userWithAllAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          userwithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      ].forEach(scenario => {
        getTest(`${scenario.userWithAllGlobally.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithAllGlobally.USERNAME,
            password: scenario.userWithAllGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(scenario.otherSpaceId),
            },
          },
        });

        getTest(`${scenario.userWithDualAll.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithDualAll.USERNAME,
            password: scenario.userWithDualAll.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(scenario.otherSpaceId),
            },
          },
        });

        getTest(`${scenario.userWithLegacyAll.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithLegacyAll.USERNAME,
            password: scenario.userWithLegacyAll.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(scenario.otherSpaceId),
            },
          },
        });

        getTest(`${scenario.userWithReadGlobally.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithReadGlobally.USERNAME,
            password: scenario.userWithReadGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(scenario.otherSpaceId),
            },
          },
        });

        getTest(`${scenario.userwithDualRead.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userwithDualRead.USERNAME,
            password: scenario.userwithDualRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(scenario.otherSpaceId),
            },
          },
        });

        getTest(`${scenario.userWithLegacyRead.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithLegacyRead.USERNAME,
            password: scenario.userWithLegacyRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(scenario.otherSpaceId),
            },
          },
        });

        getTest(`${scenario.userWithAllAtSpace.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.userWithAllAtSpace.USERNAME,
            password: scenario.userWithAllAtSpace.PASSWORD,
          },
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
