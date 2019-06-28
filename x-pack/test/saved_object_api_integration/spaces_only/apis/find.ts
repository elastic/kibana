/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { findTestSuiteFactory } from '../../common/suites/find';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    createExpectEmpty,
    createExpectVisualizationResults,
    expectNotSpaceAwareResults,
    expectTypeRequired,
    findTest,
  } = findTestSuiteFactory(esArchiver, supertest);

  describe('find', () => {
    findTest(`objects only within the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(SPACES.SPACE_1.spaceId),
        },
        notSpaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`objects only within the current space (default)`, {
      ...SPACES.DEFAULT,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(SPACES.DEFAULT.spaceId),
        },
        notSpaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });
  });
}
