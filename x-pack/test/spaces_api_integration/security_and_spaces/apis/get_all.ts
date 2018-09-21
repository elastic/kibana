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
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithReadAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
        userWithAllAtDefault: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        userWithReadAtDefault: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userwithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        notAKibanaUser: AUTHENTICATION.NOT_A_KIBANA_USER,
        superuser: AUTHENTICATION.SUPERUSER,
        userWithAllGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
        userWithReadGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
        userWithAllAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        userWithReadAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
        userWithAllAtDefault: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        userWithReadAtDefault: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
        userWithLegacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
        userWithLegacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
        userWithDualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
        userwithDualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      },
    ].forEach(scenario => {
      getAllTest(
        `${scenario.notAKibanaUser.USERNAME} can't access any spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.notAKibanaUser.USERNAME,
            password: scenario.notAKibanaUser.PASSWORD,
          },
          tests: {
            exists: {
              statusCode: 403,
              response: createExpectLegacyForbidden(scenario.notAKibanaUser.USERNAME),
            },
          },
        }
      );

      getAllTest(`${scenario.superuser.USERNAME} can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        auth: {
          username: scenario.superuser.USERNAME,
          password: scenario.superuser.PASSWORD,
        },
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
        },
      });

      getAllTest(
        `${scenario.userWithAllGlobally.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllGlobally.USERNAME,
            password: scenario.userWithAllGlobally.PASSWORD,
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
        `${scenario.userWithDualAll.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithDualAll.USERNAME,
            password: scenario.userWithDualAll.PASSWORD,
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
        `${scenario.userWithLegacyAll.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithLegacyAll.USERNAME,
            password: scenario.userWithLegacyAll.PASSWORD,
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
        `${scenario.userWithReadGlobally.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithReadGlobally.USERNAME,
            password: scenario.userWithReadGlobally.PASSWORD,
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
        `${scenario.userwithDualRead.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userwithDualRead.USERNAME,
            password: scenario.userwithDualRead.PASSWORD,
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
        `${scenario.userWithLegacyRead.USERNAME} can access all spaces from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithLegacyRead.USERNAME,
            password: scenario.userWithLegacyRead.PASSWORD,
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
        `${scenario.userWithAllAtSpace_1.USERNAME} can access space_1 from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllAtSpace_1.USERNAME,
            password: scenario.userWithAllAtSpace_1.PASSWORD,
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
        `${scenario.userWithReadAtSpace_1.USERNAME} can access space_1 from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithReadAtSpace_1.USERNAME,
            password: scenario.userWithReadAtSpace_1.PASSWORD,
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
        `${scenario.userWithAllAtDefault.USERNAME} can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithAllAtDefault.USERNAME,
            password: scenario.userWithAllAtDefault.PASSWORD,
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
        `${scenario.userWithReadAtDefault.USERNAME} can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          auth: {
            username: scenario.userWithReadAtDefault.USERNAME,
            password: scenario.userWithReadAtDefault.PASSWORD,
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
