/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { resolveCopyToSpaceConflictsSuite } from '../../common/suites/resolve_copy_to_space_conflicts';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function resolveCopyToSpaceConflictsTestSuite({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertestWithAuth = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    resolveCopyToSpaceConflictsTest,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    expectRouteForbiddenResponse,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    createMultiNamespaceTestCases,
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
    ].forEach(({ spaceId, ...scenario }) => {
      const definitionNoAccess = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 403,
            response: expectRouteForbiddenResponse,
          },
          withReferencesOverwriting: {
            statusCode: 403,
            response: expectRouteForbiddenResponse,
          },
          withoutReferencesOverwriting: {
            statusCode: 403,
            response: expectRouteForbiddenResponse,
          },
          withoutReferencesNotOverwriting: {
            statusCode: 403,
            response: expectRouteForbiddenResponse,
          },
          nonExistentSpace: {
            statusCode: 403,
            response: expectRouteForbiddenResponse,
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'noAccess'),
        },
      });
      const definitionUnauthorizedRead = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              spaceId,
              NON_EXISTENT_SPACE_ID
            ),
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'unauthorizedRead'),
        },
      });
      const definitionUnauthorizedWrite = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              spaceId,
              NON_EXISTENT_SPACE_ID
            ),
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'unauthorizedWrite'),
        },
      });
      const definitionAuthorized = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          withReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithReferences(spaceId),
          },
          withReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithReferences(spaceId),
          },
          withoutReferencesOverwriting: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(spaceId),
          },
          withoutReferencesNotOverwriting: {
            statusCode: 200,
            response: createExpectNonOverriddenResponseWithoutReferences(spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectOverriddenResponseWithoutReferences(
              spaceId,
              NON_EXISTENT_SPACE_ID
            ),
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'authorized'),
        },
      });

      resolveCopyToSpaceConflictsTest(
        `user with no access from the ${spaceId} space`,
        definitionNoAccess(scenario.users.noAccess)
      );
      resolveCopyToSpaceConflictsTest(
        `superuser from the ${spaceId} space`,
        definitionAuthorized(scenario.users.superuser)
      );
      resolveCopyToSpaceConflictsTest(
        `rbac user with all globally from the ${spaceId} space`,
        definitionAuthorized(scenario.users.allGlobally)
      );
      resolveCopyToSpaceConflictsTest(
        `dual-privileges user from the ${spaceId} space`,
        definitionAuthorized(scenario.users.dualAll)
      );
      resolveCopyToSpaceConflictsTest(
        `legacy user from the ${spaceId} space`,
        definitionNoAccess(scenario.users.legacyAll)
      );
      resolveCopyToSpaceConflictsTest(
        `rbac user with read globally from the ${spaceId} space`,
        definitionUnauthorizedWrite(scenario.users.readGlobally)
      );
      resolveCopyToSpaceConflictsTest(
        `dual-privileges readonly user from the ${spaceId} space`,
        definitionUnauthorizedWrite(scenario.users.dualRead)
      );
      resolveCopyToSpaceConflictsTest(
        `rbac user with all at space from the ${spaceId} space`,
        definitionUnauthorizedRead(scenario.users.allAtSpace)
      );
    });
  });
}
