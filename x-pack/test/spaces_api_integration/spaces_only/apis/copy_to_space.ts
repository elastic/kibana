/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { copyToSpaceTestSuiteFactory } from '../../common/suites/copy_to_space';

// eslint-disable-next-line import/no-default-export
export default function copyToSpacesOnlySuite(context: FtrProviderContext) {
  const {
    copyToSpaceTest,
    expectNoConflictsWithoutReferencesResult,
    expectNoConflictsWithReferencesResult,
    expectNoConflictsForNonExistentSpaceResult,
    createExpectWithConflictsOverwritingResult,
    createExpectWithConflictsWithoutOverwritingResult,
    createMultiNamespaceTestCases,
    originSpaces,
  } = copyToSpaceTestSuiteFactory(context);

  describe('copy to spaces', () => {
    originSpaces.forEach((spaceId) => {
      copyToSpaceTest(`from the ${spaceId} space`, {
        spaceId,
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
          multiNamespaceTestCases: createMultiNamespaceTestCases(spaceId),
        },
      });
    });
  });
}
