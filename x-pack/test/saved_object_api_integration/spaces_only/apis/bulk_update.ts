/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkUpdateTestSuiteFactory } from '../../common/suites/bulk_update';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('bulkUpdate', () => {
    const {
      createExpectSpaceAwareNotFound,
      expectSpaceAwareResults,
      createExpectDoesntExistNotFound,
      expectNotSpaceAwareResults,
      expectSpaceNotFound,
      bulkUpdateTest,
    } = bulkUpdateTestSuiteFactory(esArchiver, supertest);

    bulkUpdateTest(`in the default space`, {
      spaceId: SPACES.DEFAULT.spaceId,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 200,
          response: expectSpaceNotFound,
        },
        doesntExist: {
          statusCode: 200,
          response: createExpectDoesntExistNotFound(SPACES.DEFAULT.spaceId),
        },
      },
    });

    bulkUpdateTest('in the current space (space_1)', {
      spaceId: SPACES.SPACE_1.spaceId,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 200,
          response: expectSpaceNotFound,
        },
        doesntExist: {
          statusCode: 200,
          response: createExpectDoesntExistNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });

    bulkUpdateTest('objects that exist in another space (space_1)', {
      spaceId: SPACES.DEFAULT.spaceId,
      otherSpaceId: SPACES.SPACE_1.spaceId,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareNotFound(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 200,
          response: expectSpaceNotFound,
        },
        doesntExist: {
          statusCode: 200,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });
  });
}
