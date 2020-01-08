/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory } from '../../common/suites/find';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    createExpectEmpty,
    createExpectVisualizationResults,
    expectFilterWrongTypeError,
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
        hiddenType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
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
        filterWithNotSpaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        filterWithUnknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
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
        hiddenType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
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
        filterWithNotSpaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        filterWithUnknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
        },
      },
    });
  });
}
