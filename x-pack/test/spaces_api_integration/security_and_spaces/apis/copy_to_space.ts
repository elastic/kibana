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
    ].forEach(scenario => {
      copyToSpaceTest(`user with no access from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          noConflictsWithReferences: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withConflictsOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withConflictsWithoutOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          multipleSpaces: {
            statusCode: 404,
            withConflictsResponse: expectNotFoundResponse,
            noConflictsResponse: expectNotFoundResponse,
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
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: expectNoConflictsWithoutReferencesResult,
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: expectNoConflictsWithReferencesResult,
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsOverwritingResult(scenario.spaceId),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsWithoutOverwritingResult(scenario.spaceId),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectWithConflictsOverwritingResult(scenario.spaceId),
            noConflictsResponse: expectNoConflictsWithReferencesResult,
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNoConflictsForNonExistentSpaceResult,
          },
        },
      });

      copyToSpaceTest(`rbac user with all globally from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: expectNoConflictsWithoutReferencesResult,
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: expectNoConflictsWithReferencesResult,
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsOverwritingResult(scenario.spaceId),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsWithoutOverwritingResult(scenario.spaceId),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectWithConflictsOverwritingResult(scenario.spaceId),
            noConflictsResponse: expectNoConflictsWithReferencesResult,
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNoConflictsForNonExistentSpaceResult,
          },
        },
      });

      copyToSpaceTest(`dual-privileges user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: expectNoConflictsWithoutReferencesResult,
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: expectNoConflictsWithReferencesResult,
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsOverwritingResult(scenario.spaceId),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsWithoutOverwritingResult(scenario.spaceId),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectWithConflictsOverwritingResult(scenario.spaceId),
            noConflictsResponse: expectNoConflictsWithReferencesResult,
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNoConflictsForNonExistentSpaceResult,
          },
        },
      });

      copyToSpaceTest(`legacy user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          noConflictsWithReferences: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withConflictsOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          withConflictsWithoutOverwriting: {
            statusCode: 404,
            response: expectNotFoundResponse,
          },
          multipleSpaces: {
            statusCode: 404,
            withConflictsResponse: expectNotFoundResponse,
            noConflictsResponse: expectNotFoundResponse,
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
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
            noConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              scenario.spaceId,
              'non-existent'
            ),
          },
        },
      });

      copyToSpaceTest(`dual-privileges readonly user from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
            noConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              scenario.spaceId,
              'non-existent'
            ),
          },
        },
      });

      copyToSpaceTest(`rbac user with all at space from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace,
        tests: {
          noConflictsWithoutReferences: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          noConflictsWithReferences: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          withConflictsOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'with-conflicts'
            ),
            noConflictsResponse: createExpectUnauthorizedAtSpaceWithReferencesResult(
              scenario.spaceId,
              'without-conflicts'
            ),
          },
          nonExistentSpace: {
            statusCode: 200,
            response: createExpectUnauthorizedAtSpaceWithoutReferencesResult(
              scenario.spaceId,
              'non-existent'
            ),
          },
        },
      });
    });
  });
}
