/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { resolveCopyToSpaceConflictsSuite } from '../../common/suites/resolve_copy_to_space_conflicts';

// eslint-disable-next-line import/no-default-export
export default function resolveCopyToSpaceConflictsTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertestWithAuth = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    copyToSpaceTest,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    expectNotFoundResponse,
    createExpectSpaceNotFoundResult,
    createExpectUnauthorizedAtSpaceResult,
  } = resolveCopyToSpaceConflictsSuite(esArchiver, supertestWithAuth, supertestWithoutAuth);

  describe('resolve copy to spaces conflicts', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
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
          allAtSpace: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
        },
      },
    ].forEach(scenario => {
      copyToSpaceTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withReferencesOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withoutReferencesOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withoutReferencesNotOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          nonExistentSpace: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
        },
      });

      copyToSpaceTest(`superuser from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.superuser,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithReferences(scenario.spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithReferences(scenario.spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(scenario.spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithoutReferences(scenario.spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNotFoundResponse,
          },
        },
      });

      copyToSpaceTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithReferences(scenario.spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithReferences(scenario.spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(scenario.spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithoutReferences(scenario.spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNotFoundResponse,
          },
        },
      });

      copyToSpaceTest(`dual-privileges user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithReferences(scenario.spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithReferences(scenario.spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(scenario.spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithoutReferences(scenario.spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNotFoundResponse,
          },
        },
      });

      copyToSpaceTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withReferencesOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withoutReferencesOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withoutReferencesNotOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          nonExistentSpace: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
        },
      });

      copyToSpaceTest(`rbac user with read globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
        },
      });

      copyToSpaceTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceResult(scenario.spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
        },
      });

      copyToSpaceTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectSpaceNotFoundResult(scenario.spaceId),
          },
        },
      });
    });
  });
}
