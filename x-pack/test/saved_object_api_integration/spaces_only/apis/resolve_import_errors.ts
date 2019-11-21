/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { resolveImportErrorsTestSuiteFactory } from '../../common/suites/resolve_import_errors';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const {
    resolveImportErrorsTest,
    createExpectResults,
    expectUnknownTypeUnsupported,
    expectHiddenTypeUnsupported,
  } = resolveImportErrorsTestSuiteFactory(es, esArchiver, supertest);

  describe('_resolve_import_errors', () => {
    resolveImportErrorsTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(SPACES.SPACE_1.spaceId),
        },
        hiddenType: {
          statusCode: 200,
          response: expectHiddenTypeUnsupported,
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownTypeUnsupported,
        },
      },
    });

    resolveImportErrorsTest('in the default space', {
      ...SPACES.DEFAULT,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(SPACES.DEFAULT.spaceId),
        },
        hiddenType: {
          statusCode: 200,
          response: expectHiddenTypeUnsupported,
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownTypeUnsupported,
        },
      },
    });
  });
}
