/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createTestSuiteFactory } from '../../common/suites/create';

const expectNamespaceSpecifiedBadRequest = (resp: { [key: string]: any }) => {
  expect(resp.body).to.eql({
    error: 'Bad Request',
    message: '[request body.namespace]: definition for this key is missing',
    statusCode: 400,
  });
};

export default function({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults,
    expectBadRequestForHiddenType,
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
        hiddenType: {
          statusCode: 400,
          response: expectBadRequestForHiddenType,
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
        hiddenType: {
          statusCode: 400,
          response: expectBadRequestForHiddenType,
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
