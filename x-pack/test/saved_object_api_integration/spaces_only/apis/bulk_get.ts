/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkGetTestSuiteFactory } from '../../common/suites/bulk_get';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    bulkGetTest,
    createExpectResults,
    createExpectNotFoundResults,
    expectBadRequestForHiddenType,
  } = bulkGetTestSuiteFactory(esArchiver, supertest);

  describe('_bulk_get', () => {
    bulkGetTest(`objects within the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(SPACES.SPACE_1.spaceId),
        },
        includingHiddenType: {
          statusCode: 200,
          response: expectBadRequestForHiddenType,
        },
      },
    });

    bulkGetTest(`objects within another space`, {
      ...SPACES.SPACE_1,
      otherSpaceId: SPACES.SPACE_2.spaceId,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectNotFoundResults(SPACES.SPACE_2.spaceId),
        },
        includingHiddenType: {
          statusCode: 200,
          response: expectBadRequestForHiddenType,
        },
      },
    });
  });
}
