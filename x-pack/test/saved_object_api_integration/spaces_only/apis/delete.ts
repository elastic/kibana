/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteTestSuiteFactory } from '../../common/suites/delete';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('delete', () => {
    const {
      createExpectSpaceAwareNotFound,
      createExpectUnknownDocNotFound,
      deleteTest,
      expectEmpty,
      expectGenericNotFound,
      expectSharedTypeNotFound,
    } = deleteTestSuiteFactory(esArchiver, supertest);

    deleteTest(`in the default space`, {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        hiddenType: {
          statusCode: 404,
          response: expectGenericNotFound,
        },
        sharedType: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(SPACES.DEFAULT.spaceId),
        },
      },
    });

    deleteTest(`in the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        hiddenType: {
          statusCode: 404,
          response: expectGenericNotFound,
        },
        sharedType: {
          statusCode: 200,
          response: expectEmpty,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });

    deleteTest(`in another space (in space_2 deleting object in space_1)`, {
      spaceId: SPACES.SPACE_2.spaceId,
      otherSpaceId: SPACES.SPACE_1.spaceId,
      tests: {
        spaceAware: {
          statusCode: 404,
          response: createExpectSpaceAwareNotFound(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty,
        },
        hiddenType: {
          statusCode: 404,
          response: expectGenericNotFound,
        },
        sharedType: {
          statusCode: 404,
          response: expectSharedTypeNotFound,
        },
        invalidId: {
          statusCode: 404,
          response: createExpectUnknownDocNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });
  });
}
