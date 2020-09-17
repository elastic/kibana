/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { copyToSpaceTestSuiteFactory } from '../../common/suites/copy_to_space';

// eslint-disable-next-line import/no-default-export
export default function copyToSpaceSpacesAndSecuritySuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const {
    copyToSpaceTest,
    expectNoConflictsWithoutReferencesResult,
    expectNoConflictsWithReferencesResult,
    expectNoConflictsForNonExistentSpaceResult,
    createExpectWithConflictsOverwritingResult,
    createExpectWithConflictsWithoutOverwritingResult,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    expectNotFoundResponse,
    createMultiNamespaceTestCases,
  } = copyToSpaceTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('copy to spaces', () => {
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
          noConflictsWithoutReferences: { statusCode: 404, response: expectNotFoundResponse },
          noConflictsWithReferences: { statusCode: 404, response: expectNotFoundResponse },
          withConflictsOverwriting: { statusCode: 404, response: expectNotFoundResponse },
          withConflictsWithoutOverwriting: { statusCode: 404, response: expectNotFoundResponse },
          multipleSpaces: {
            statusCode: 404,
            withConflictsResponse: expectNotFoundResponse,
            noConflictsResponse: expectNotFoundResponse,
          },
          nonExistentSpace: { statusCode: 404, response: expectNotFoundResponse },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'noAccess'),
        },
      });
      // In *this* test suite, a user who is unauthorized to write (but authorized to read) in the destination space will get the same exact
      // results as a user who is unauthorized to read in the destination space. However, that may not *always* be the case depending on the
      // input that is submitted, due to the `validateReferences` check that can trigger a `bulkGet` for the destination space. See also the
      // integration tests in `./resolve_copy_to_space_conflicts`, which behave differently.
      const commonUnauthorizedTests = {
        noConflictsWithoutReferences: {
          statusCode: 200,
          response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
            spaceId,
            'without-conflicts'
          ),
        },
        noConflictsWithReferences: {
          statusCode: 200,
          response: createExpectUnauthorizedAtSpaceWithReferencesResult(
            spaceId,
            'without-conflicts'
          ),
        },
        withConflictsOverwriting: {
          statusCode: 200,
          response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId, 'with-conflicts'),
        },
        withConflictsWithoutOverwriting: {
          statusCode: 200,
          response: createExpectUnauthorizedAtSpaceWithReferencesResult(spaceId, 'with-conflicts'),
        },
        multipleSpaces: {
          statusCode: 200,
          withConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
            spaceId,
            'with-conflicts'
          ),
          noConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
            spaceId,
            'without-conflicts'
          ),
        },
        nonExistentSpace: {
          statusCode: 200,
          response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(spaceId, 'non-existent'),
        },
      };
      const definitionUnauthorizedRead = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          ...commonUnauthorizedTests,
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'unauthorizedRead'),
        },
      });
      const definitionUnauthorizedWrite = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          ...commonUnauthorizedTests,
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'unauthorizedWrite'),
        },
      });
      const definitionAuthorized = (user: { username: string; password: string }) => ({
        spaceId,
        user,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: expectNoConflictsWithoutReferencesResult(spaceId),
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: expectNoConflictsWithReferencesResult(spaceId),
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsOverwritingResult(spaceId),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsWithoutOverwritingResult(spaceId),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectWithConflictsOverwritingResult(spaceId),
            noConflictsResponse: expectNoConflictsWithReferencesResult(spaceId),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNoConflictsForNonExistentSpaceResult(spaceId),
          },
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId, 'authorized'),
        },
      });

      copyToSpaceTest(
        `user with no access from the ${spaceId} space`,
        definitionNoAccess(scenario.users.noAccess)
      );
      copyToSpaceTest(
        `superuser from the ${spaceId} space`,
        definitionAuthorized(scenario.users.superuser)
      );
      copyToSpaceTest(
        `rbac user with all globally from the ${spaceId} space`,
        definitionAuthorized(scenario.users.allGlobally)
      );
      copyToSpaceTest(
        `dual-privileges user from the ${spaceId} space`,
        definitionAuthorized(scenario.users.dualAll)
      );
      copyToSpaceTest(
        `legacy user from the ${spaceId} space`,
        definitionNoAccess(scenario.users.legacyAll)
      );
      copyToSpaceTest(
        `rbac user with read globally from the ${spaceId} space`,
        definitionUnauthorizedWrite(scenario.users.readGlobally)
      );
      copyToSpaceTest(
        `dual-privileges readonly user from the ${spaceId} space`,
        definitionUnauthorizedWrite(scenario.users.dualRead)
      );
      copyToSpaceTest(
        `rbac user with all at space from the ${spaceId} space`,
        definitionUnauthorizedRead(scenario.users.allAtSpace)
      );
    });
  });
}
