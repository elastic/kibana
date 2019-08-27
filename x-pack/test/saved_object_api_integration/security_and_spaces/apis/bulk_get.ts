/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkGetTestSuiteFactory } from '../../common/suites/bulk_get';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    bulkGetTest,
    createExpectResults,
    createExpectRbacForbidden,
    expectBadRequestForHiddenType,
    expectedForbiddenTypesWithHiddenType,
  } = bulkGetTestSuiteFactory(esArchiver, supertest);

  describe('_bulk_get', () => {
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
      bulkGetTest(`user with no access within the ${scenario.spaceId} space`, {
        user: scenario.users.noAccess,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 403,
            response: createExpectRbacForbidden(),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(expectedForbiddenTypesWithHiddenType),
          },
        },
      });

      bulkGetTest(`superuser within the ${scenario.spaceId} space`, {
        user: scenario.users.superuser,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 200,
            response: expectBadRequestForHiddenType,
          },
        },
      });

      bulkGetTest(`legacy user within the ${scenario.spaceId} space`, {
        user: scenario.users.legacyAll,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 403,
            response: createExpectRbacForbidden(),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(expectedForbiddenTypesWithHiddenType),
          },
        },
      });

      bulkGetTest(`dual-privileges user within the ${scenario.spaceId} space`, {
        user: scenario.users.dualAll,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(['hiddentype']),
          },
        },
      });

      bulkGetTest(`dual-privileges readonly user within the ${scenario.spaceId} space`, {
        user: scenario.users.dualRead,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(['hiddentype']),
          },
        },
      });

      bulkGetTest(`rbac user with all globally within the ${scenario.spaceId} space`, {
        user: scenario.users.allGlobally,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(['hiddentype']),
          },
        },
      });

      bulkGetTest(`rbac user with read globally within the ${scenario.spaceId} space`, {
        user: scenario.users.readGlobally,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(['hiddentype']),
          },
        },
      });

      bulkGetTest(`rbac user with all at the space within the ${scenario.spaceId} space`, {
        user: scenario.users.allAtSpace,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(['hiddentype']),
          },
        },
      });

      bulkGetTest(`rbac user with read at the space within the ${scenario.spaceId} space`, {
        user: scenario.users.readAtSpace,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(['hiddentype']),
          },
        },
      });

      bulkGetTest(`rbac user with all at other space within the ${scenario.spaceId} space`, {
        user: scenario.users.allAtOtherSpace,
        spaceId: scenario.spaceId,
        tests: {
          default: {
            statusCode: 403,
            response: createExpectRbacForbidden(),
          },
          includingHiddenType: {
            statusCode: 403,
            response: createExpectRbacForbidden(expectedForbiddenTypesWithHiddenType),
          },
        },
      });
    });
  });
}
