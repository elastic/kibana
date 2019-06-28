/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { createTestSuiteFactory } from '../../common/suites/create';

const expectNamespaceSpecifiedBadRequest = (resp: { [key: string]: any }) => {
  expect(resp.body).to.eql({
    error: 'Bad Request',
    message: '"namespace" is not allowed',
    statusCode: 400,
    validation: {
      keys: ['namespace'],
      source: 'payload',
    },
  });
};

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults,
  } = createTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('create', () => {
    createTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        custom: {
          description: 'when a namespace is specified on the saved object',
          type: 'visualization',
          requestBody: {
            namespace: 'space_1',
            attributes: {
              title: 'something',
            },
          },
          statusCode: 400,
          response: expectNamespaceSpecifiedBadRequest,
        },
      },
    });

    createTest('in the default space', {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(SPACES.DEFAULT.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        custom: {
          description: 'when a namespace is specified on the saved object',
          type: 'visualization',
          requestBody: {
            namespace: 'space_1',
            attributes: {
              title: 'something',
            },
          },
          statusCode: 400,
          response: expectNamespaceSpecifiedBadRequest,
        },
      },
    });
  });
}
