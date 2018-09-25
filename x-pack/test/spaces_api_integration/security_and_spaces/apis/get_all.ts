/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { getAllTestSuiteFactory } from '../../common/suites/get_all';

// tslint:disable:no-default-export
export default function getAllSpacesTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { getAllTest, createExpectResults, createExpectLegacyForbidden } = getAllTestSuiteFactory(
    esArchiver,
    supertestWithoutAuth
  );

  describe('get all', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
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
          allAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      getAllTest(
        `${scenario.users.noAccess.USERNAME} can't access any spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.noAccess.USERNAME,
            password: scenario.users.noAccess.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.superuser.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.superuser.USERNAME,
            password: scenario.users.superuser.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.allGlobally.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.allGlobally.USERNAME,
            password: scenario.users.allGlobally.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.dualAll.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.dualAll.USERNAME,
            password: scenario.users.dualAll.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.legacyAll.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.legacyAll.USERNAME,
            password: scenario.users.legacyAll.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.readGlobally.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.readGlobally.USERNAME,
            password: scenario.users.readGlobally.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.dualRead.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.dualRead.USERNAME,
            password: scenario.users.dualRead.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.legacyRead.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.legacyRead.USERNAME,
            password: scenario.users.legacyRead.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default', 'space_1', 'space_2'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.allAtSpace_1.USERNAME} can access space_1 from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.allAtSpace_1.USERNAME,
            password: scenario.users.allAtSpace_1.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('space_1'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.readAtSpace_1.USERNAME} can access space_1 from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.readAtSpace_1.USERNAME,
            password: scenario.users.readAtSpace_1.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('space_1'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.allAtDefaultSpace.USERNAME} can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.allAtDefaultSpace.USERNAME,
            password: scenario.users.allAtDefaultSpace.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
          },
        }
      );

      getAllTest(
        `${scenario.users.readAtDefaultSpace.USERNAME} can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.users.readAtDefaultSpace.USERNAME,
            password: scenario.users.readAtDefaultSpace.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
          },
        }
      );
    });
  });
}
