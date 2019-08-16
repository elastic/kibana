/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { copyToSpaceTestSuiteFactory } from '../../common/suites/copy_to_space';

// eslint-disable-next-line import/no-default-export
export default function copyToSpacesOnlySuite({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const {
    copyToSpaceTest,
    expectNoConflictsWithoutReferencesResult,
    expectNoConflictsWithReferencesResult,
    expectNoConflictsForNonExistentSpaceResult,
    createExpectWithConflictsOverwritingResult,
    createExpectWithConflictsWithoutOverwritingResult,
    originSpaces,
  } = copyToSpaceTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('copy to spaces', () => {
    originSpaces.forEach(spaceId => {
      copyToSpaceTest(`from the ${spaceId} space`, {
        spaceId,
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
            response: createExpectWithConflictsOverwritingResult(spaceId),
          },
          withConflictsWithoutOverwriting: {
            statusCode: 200,
            response: createExpectWithConflictsWithoutOverwritingResult(spaceId),
          },
          multipleSpaces: {
            statusCode: 200,
            withConflictsResponse: createExpectWithConflictsOverwritingResult(spaceId),
            noConflictsResponse: expectNoConflictsWithReferencesResult,
          },
          nonExistentSpace: {
            statusCode: 200,
            response: expectNoConflictsForNonExistentSpaceResult,
          },
        },
      });
    });
  });
}
