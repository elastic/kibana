/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { importTestSuiteFactory } from '../../common/suites/import';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const {
    importTest,
    createExpectResults,
    expectUnknownTypeUnsupported,
    expectHiddenTypeUnsupported,
  } = importTestSuiteFactory(es, esArchiver, supertest);

  describe('_import', () => {
    importTest('in the current space (space_1)', {
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

    importTest('in the default space', {
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
