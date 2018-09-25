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
    createExpectRbacForbidden,
    createExpectLegacyForbidden,
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
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
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
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      getTest(`${scenario.users.noAccess.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
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

      getTest(`${scenario.users.superuser.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.superuser.USERNAME,
          password: scenario.users.superuser.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.allGlobally.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.allGlobally.USERNAME,
          password: scenario.users.allGlobally.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.dualAll.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.dualAll.USERNAME,
          password: scenario.users.dualAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.legacyAll.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.legacyAll.USERNAME,
          password: scenario.users.legacyAll.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.readGlobally.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.readGlobally.USERNAME,
          password: scenario.users.readGlobally.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.dualRead.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.dualRead.USERNAME,
          password: scenario.users.dualRead.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.legacyRead.USERNAME}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.legacyRead.USERNAME,
          password: scenario.users.legacyRead.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.readAtSpace.USERNAME} at ${scenario.spaceId}`, {
        currentSpaceId: scenario.spaceId,
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.users.readAtSpace.USERNAME,
          password: scenario.users.readAtSpace.PASSWORD,
        },
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });

      getTest(`${scenario.users.allAtOtherSpace.USERNAME} at a different space`, {
        currentSpaceId: scenario.otherSpaceId,
        spaceId: scenario.spaceId,
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
      });
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
            legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
            dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
            dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
          },
        },
      ].forEach(scenario => {
        getTest(`${scenario.users.allGlobally.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.allGlobally.USERNAME,
            password: scenario.users.allGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`${scenario.users.dualAll.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.dualAll.USERNAME,
            password: scenario.users.dualAll.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`${scenario.users.legacyAll.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.legacyAll.USERNAME,
            password: scenario.users.legacyAll.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`${scenario.users.readGlobally.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.readGlobally.USERNAME,
            password: scenario.users.readGlobally.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`${scenario.users.dualRead.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.dualRead.USERNAME,
            password: scenario.users.dualRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`${scenario.users.legacyRead.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.legacyRead.USERNAME,
            password: scenario.users.legacyRead.PASSWORD,
          },
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });

        getTest(`${scenario.users.allAtDefaultSpace.USERNAME}`, {
          currentSpaceId: scenario.spaceId,
          spaceId: scenario.otherSpaceId,
          auth: {
            username: scenario.users.allAtDefaultSpace.USERNAME,
            password: scenario.users.allAtDefaultSpace.PASSWORD,
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
