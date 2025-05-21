/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveCopyToSpaceConflictsSuite } from '../../../common/suites/resolve_copy_to_space_conflicts.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function resolveCopyToSpaceConflictsTestSuite(
  context: DeploymentAgnosticFtrProviderContext
) {
  const {
    resolveCopyToSpaceConflictsTest,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    createMultiNamespaceTestCases,
    NON_EXISTENT_SPACE_ID,
    originSpaces,
  } = resolveCopyToSpaceConflictsSuite(context);

  describe('resolve copy to spaces conflicts', () => {
    originSpaces.forEach((spaceId) => {
      resolveCopyToSpaceConflictsTest(`from the ${spaceId} space`, {
        spaceId,
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
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId),
        },
      });
    });
  });
}
