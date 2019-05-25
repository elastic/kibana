/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { getTestSuiteFactory } from '../../common/suites/get';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    createExpectDoesntExistNotFound,
    createExpectSpaceAwareNotFound,
    createExpectSpaceAwareResults,
    createExpectNotSpaceAwareResults,
    getTest,
  } = getTestSuiteFactory(esArchiver, supertest);

  describe('get', () => {
    getTest(`can access objects belonging to the current space (default)`, {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(SPACES.DEFAULT.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(SPACES.DEFAULT.spaceId),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(SPACES.DEFAULT.spaceId),
        },
      },
    });

    getTest(`can access objects belonging to the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(SPACES.SPACE_1.spaceId),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });

    getTest(`can't access space aware objects belonging to another space (space_1)`, {
      spaceId: SPACES.DEFAULT.spaceId,
      otherSpaceId: SPACES.SPACE_1.spaceId,
      tests: {
        spaceAware: {
          statusCode: 404,
          response: createExpectSpaceAwareNotFound(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(SPACES.SPACE_1.spaceId),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(SPACES.SPACE_1.spaceId),
        },
      },
    });
  });
}
