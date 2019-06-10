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
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    createExpectDoesntExistNotFound,
    createExpectSpaceAwareResults,
    createExpectNotSpaceAwareResults,
    expectSpaceAwareRbacForbidden,
    expectNotSpaceAwareRbacForbidden,
    expectDoesntExistRbacForbidden,
    getTest,
  } = getTestSuiteFactory(esArchiver, supertest);

  describe('get', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
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
      getTest(`user with no access within the ${scenario.spaceId} space`, {
        user: scenario.users.noAccess,
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
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      getTest(`superuser within the ${scenario.spaceId} space`, {
        user: scenario.users.superuser,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`legacy user within the ${scenario.spaceId} space`, {
        user: scenario.users.legacyAll,
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
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      getTest(`dual-privileges user within the ${scenario.spaceId} space`, {
        user: scenario.users.dualAll,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`dual-privileges readonly user within the ${scenario.spaceId} space`, {
        user: scenario.users.dualRead,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with all globally within the ${scenario.spaceId} space`, {
        user: scenario.users.allGlobally,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with read globall within the ${scenario.spaceId} space`, {
        user: scenario.users.readGlobally,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with all at the space within the ${scenario.spaceId} space`, {
        user: scenario.users.allAtSpace,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with read at the space within the ${scenario.spaceId} space`, {
        user: scenario.users.readAtSpace,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: createExpectSpaceAwareResults(scenario.spaceId),
          },
          notSpaceAware: {
            statusCode: 200,
            response: createExpectNotSpaceAwareResults(scenario.spaceId),
          },
          doesntExist: {
            statusCode: 404,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      getTest(`rbac user with all at other space within the ${scenario.spaceId} space`, {
        user: scenario.users.allAtOtherSpace,
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
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });
    });
  });
}
