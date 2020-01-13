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
      expectHiddenTypeNotFound,
      expectSharedTypeNotFound,
      expectSharedTypeResults,
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
          response: expectHiddenTypeNotFound,
        },
        sharedType: {
          statusCode: 200,
          response: expectSharedTypeResults,
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
          response: expectHiddenTypeNotFound,
        },
        sharedType: {
          statusCode: 200,
          response: expectSharedTypeResults,
        },
        doesntExist: {
          statusCode: 200,
          response: createExpectDoesntExistNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });

    bulkUpdateTest('objects that exist in another space (in space_2 updating objects in space_1)', {
      spaceId: SPACES.SPACE_2.spaceId,
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
          response: expectHiddenTypeNotFound,
        },
        sharedType: {
          statusCode: 200,
          response: expectSharedTypeNotFound,
        },
        doesntExist: {
          statusCode: 200,
          response: createExpectDoesntExistNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });
  });
}
