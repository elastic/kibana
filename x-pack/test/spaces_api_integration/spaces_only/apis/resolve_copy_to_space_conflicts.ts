/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { resolveCopyToSpaceConflictsSuite } from '../../common/suites/resolve_copy_to_space_conflicts';

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
    createMultiNamespaceTestCases,
    NON_EXISTENT_SPACE_ID,
    originSpaces,
  } = resolveCopyToSpaceConflictsSuite(esArchiver, supertestWithAuth, supertestWithoutAuth);

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
