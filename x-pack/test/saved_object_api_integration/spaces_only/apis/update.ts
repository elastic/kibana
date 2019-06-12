/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { updateTestSuiteFactory } from '../../common/suites/update';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    const {
      createExpectSpaceAwareNotFound,
      expectSpaceAwareResults,
      createExpectDoesntExistNotFound,
      expectNotSpaceAwareResults,
      updateTest,
    } = updateTestSuiteFactory(esArchiver, supertest);

    updateTest(`in the default space`, {
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
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(SPACES.DEFAULT.spaceId),
        },
      },
    });

    updateTest('in the current space (space_1)', {
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
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });

    updateTest('objects that exist in another space (space_1)', {
      spaceId: SPACES.DEFAULT.spaceId,
      otherSpaceId: SPACES.SPACE_1.spaceId,
      tests: {
        spaceAware: {
          statusCode: 404,
          response: createExpectSpaceAwareNotFound(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });
  });
}
