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
    resolveCopyToSpaceConflictsTest,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    expectNotFoundResponse,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectReadonlyAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    NON_EXISTENT_SPACE_ID,
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
    ].forEach((scenario) => {
      resolveCopyToSpaceConflictsTest(`user with no access from the ${scenario.spaceId} space`, {
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

      resolveCopyToSpaceConflictsTest(`superuser from the ${scenario.spaceId} space`, {
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
            response: createExpectOverriddenResponseWithoutReferences(
              scenario.spaceId,
              NON_EXISTENT_SPACE_ID
            ),
          },
        },
      });

      resolveCopyToSpaceConflictsTest(
        `rbac user with all globally from the ${scenario.spaceId} space`,
        {
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
              response: createExpectOverriddenResponseWithoutReferences(
                scenario.spaceId,
                NON_EXISTENT_SPACE_ID
              ),
            },
          },
        }
      );

      resolveCopyToSpaceConflictsTest(`dual-privileges user from the ${scenario.spaceId} space`, {
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
            response: createExpectOverriddenResponseWithoutReferences(
              scenario.spaceId,
              NON_EXISTENT_SPACE_ID
            ),
          },
        },
      });

      resolveCopyToSpaceConflictsTest(`legacy user from the ${scenario.spaceId} space`, {
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

      resolveCopyToSpaceConflictsTest(
        `rbac user with read globally from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.readGlobally,
          tests: {
            withReferencesNotOverwriting: {
              statusCode: 200,
              response: createExpectReadonlyAtSpaceWithReferencesResult(scenario.spaceId),
            },
            withReferencesOverwriting: {
              statusCode: 200,
              response: createExpectReadonlyAtSpaceWithReferencesResult(scenario.spaceId),
            },
            withoutReferencesOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(scenario.spaceId),
            },
            withoutReferencesNotOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(scenario.spaceId),
            },
            nonExistentSpace: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
                scenario.spaceId,
                NON_EXISTENT_SPACE_ID
              ),
            },
          },
        }
      );

      resolveCopyToSpaceConflictsTest(
        `dual-privileges readonly user from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.dualRead,
          tests: {
            withReferencesNotOverwriting: {
              statusCode: 200,
              response: createExpectReadonlyAtSpaceWithReferencesResult(scenario.spaceId),
            },
            withReferencesOverwriting: {
              statusCode: 200,
              response: createExpectReadonlyAtSpaceWithReferencesResult(scenario.spaceId),
            },
            withoutReferencesOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(scenario.spaceId),
            },
            withoutReferencesNotOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(scenario.spaceId),
            },
            nonExistentSpace: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
                scenario.spaceId,
                NON_EXISTENT_SPACE_ID
              ),
            },
          },
        }
      );

      resolveCopyToSpaceConflictsTest(
        `rbac user with all at space from the ${scenario.spaceId} space`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.allAtSpace,
          tests: {
            withReferencesNotOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithReferencesResult(scenario.spaceId),
            },
            withReferencesOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithReferencesResult(scenario.spaceId),
            },
            withoutReferencesOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(scenario.spaceId),
            },
            withoutReferencesNotOverwriting: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(scenario.spaceId),
            },
            nonExistentSpace: {
              statusCode: 200,
              response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
                scenario.spaceId,
                NON_EXISTENT_SPACE_ID
              ),
            },
          },
        }
      );
    });
  });
}
