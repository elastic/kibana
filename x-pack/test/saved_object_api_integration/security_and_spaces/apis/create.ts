/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { createTestSuiteFactory } from '../../common/suites/create';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    createExpectLegacyForbidden,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults,
    expectNotSpaceAwareRbacForbidden,
    expectSpaceAwareRbacForbidden,
  } = createTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('create', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          allAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          legacyRead: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtOtherSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
        },
      },
    ].forEach(scenario => {
      createTest(`${scenario.users.noAccess.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.noAccess.USERNAME,
          password: scenario.users.noAccess.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(scenario.users.noAccess.USERNAME),
          },
        },
      });

      createTest(`${scenario.users.superuser.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.superuser.USERNAME,
          password: scenario.users.superuser.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        },
      });

      createTest(`${scenario.users.legacyAll.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.legacyAll.USERNAME,
          password: scenario.users.legacyAll.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        },
      });

      createTest(`${scenario.users.legacyRead.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.legacyRead.USERNAME,
          password: scenario.users.legacyRead.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(scenario.users.legacyRead.USERNAME),
          },
          notSpaceAware: {
            statusCode: 403,
            response: createExpectLegacyForbidden(scenario.users.legacyRead.USERNAME),
          },
        },
      });

      createTest(`${scenario.users.dualAll.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.dualAll.USERNAME,
          password: scenario.users.dualAll.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        },
      });

      createTest(`${scenario.users.dualRead.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.dualRead.USERNAME,
          password: scenario.users.dualRead.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: expectSpaceAwareRbacForbidden,
          },
          notSpaceAware: {
            statusCode: 403,
            response: expectNotSpaceAwareRbacForbidden,
          },
        },
      });

      createTest(`${scenario.users.allGlobally.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.allGlobally.USERNAME,
          password: scenario.users.allGlobally.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        },
      });

      createTest(`${scenario.users.readGlobally.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.readGlobally.USERNAME,
          password: scenario.users.readGlobally.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: expectSpaceAwareRbacForbidden,
          },
          notSpaceAware: {
            statusCode: 403,
            response: expectNotSpaceAwareRbacForbidden,
          },
        },
      });

      createTest(`${scenario.users.allAtSpace.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.allAtSpace.USERNAME,
          password: scenario.users.allAtSpace.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
        },
      });

      createTest(`${scenario.users.readAtSpace.USERNAME} within the ${scenario.spaceId} space`, {
        auth: {
          username: scenario.users.readAtSpace.USERNAME,
          password: scenario.users.readAtSpace.PASSWORD,
        },
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 403,
            response: expectSpaceAwareRbacForbidden,
          },
          notSpaceAware: {
            statusCode: 403,
            response: expectNotSpaceAwareRbacForbidden,
          },
        },
      });

      createTest(
        `${scenario.users.allAtOtherSpace.USERNAME} within the ${scenario.spaceId} space`,
        {
          auth: {
            username: scenario.users.allAtOtherSpace.USERNAME,
            password: scenario.users.allAtOtherSpace.PASSWORD,
          },
          spaceId: scenario.spaceId,
          tests: {
            spaceAware: {
              statusCode: 403,
              response: expectSpaceAwareRbacForbidden,
            },
            notSpaceAware: {
              statusCode: 403,
              response: expectNotSpaceAwareRbacForbidden,
            },
          },
        }
      );
    });
  });
}
