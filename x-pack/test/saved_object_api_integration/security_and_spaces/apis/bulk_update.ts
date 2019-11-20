/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkUpdateTestSuiteFactory } from '../../common/suites/bulk_update';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('bulkUpdate', () => {
    const {
      createExpectDoesntExistNotFound,
      expectDoesntExistRbacForbidden,
      expectNotSpaceAwareResults,
      expectNotSpaceAwareRbacForbidden,
      expectSpaceAwareRbacForbidden,
      expectSpaceAwareResults,
      expectSpaceNotFound,
      expectHiddenTypeRbacForbidden,
      expectHiddenTypeRbacForbiddenWithGlobalAllowed,
      bulkUpdateTest,
    } = bulkUpdateTestSuiteFactory(esArchiver, supertest);

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
      bulkUpdateTest(`user with no access within the ${scenario.spaceId} space`, {
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
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      bulkUpdateTest(`superuser within the ${scenario.spaceId} space`, {
        user: scenario.users.superuser,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: expectSpaceAwareResults,
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
          hiddenType: {
            statusCode: 200,
            response: expectSpaceNotFound,
          },
          doesntExist: {
            statusCode: 200,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      bulkUpdateTest(`legacy user within the ${scenario.spaceId} space`, {
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
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      bulkUpdateTest(`dual-privileges user within the ${scenario.spaceId} space`, {
        user: scenario.users.dualAll,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: expectSpaceAwareResults,
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbiddenWithGlobalAllowed,
          },
          doesntExist: {
            statusCode: 200,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      bulkUpdateTest(`dual-privileges readonly user within the ${scenario.spaceId} space`, {
        user: scenario.users.dualRead,
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
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      bulkUpdateTest(`rbac user with all globally within the ${scenario.spaceId} space`, {
        user: scenario.users.allGlobally,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: expectSpaceAwareResults,
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbiddenWithGlobalAllowed,
          },
          doesntExist: {
            statusCode: 200,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      bulkUpdateTest(`rbac user with read globally within the ${scenario.spaceId} space`, {
        user: scenario.users.readGlobally,
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
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      bulkUpdateTest(`rbac user with all at the space within the ${scenario.spaceId} space`, {
        user: scenario.users.allAtSpace,
        spaceId: scenario.spaceId,
        tests: {
          spaceAware: {
            statusCode: 200,
            response: expectSpaceAwareResults,
          },
          notSpaceAware: {
            statusCode: 200,
            response: expectNotSpaceAwareResults,
          },
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbiddenWithGlobalAllowed,
          },
          doesntExist: {
            statusCode: 200,
            response: createExpectDoesntExistNotFound(scenario.spaceId),
          },
        },
      });

      bulkUpdateTest(`rbac user with read at the space within the ${scenario.spaceId} space`, {
        user: scenario.users.readAtSpace,
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
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbidden,
          },
          doesntExist: {
            statusCode: 403,
            response: expectDoesntExistRbacForbidden,
          },
        },
      });

      bulkUpdateTest(`rbac user with all at other space within the ${scenario.spaceId} space`, {
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
          hiddenType: {
            statusCode: 403,
            response: expectHiddenTypeRbacForbidden,
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
