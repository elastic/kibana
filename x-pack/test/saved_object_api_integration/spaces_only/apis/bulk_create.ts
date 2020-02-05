/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkCreateTestSuiteFactory } from '../../common/suites/bulk_create';

const expectNamespaceSpecifiedBadRequest = (resp: { [key: string]: any }) => {
  expect(resp.body).to.eql({
    error: 'Bad Request',
    message:
      '"value" at position 0 fails because ["namespace" is not allowed]. "value" does not contain 1 required value(s)',
    statusCode: 400,
    validation: {
      keys: ['0.namespace', 'value'],
      source: 'payload',
    },
  });
};

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const {
    bulkCreateTest,
    createExpectResults,
    expectBadRequestForHiddenType,
  } = bulkCreateTestSuiteFactory(es, esArchiver, supertest);

  describe('_bulk_create', () => {
    bulkCreateTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(SPACES.SPACE_1.spaceId),
        },
        includingSpace: {
          statusCode: 200,
          response: expectBadRequestForHiddenType,
        },
        custom: {
          description: 'when a namespace is specified on the saved object',
          requestBody: [
            {
              type: 'visualization',
              namespace: 'space_1',
              attributes: {
                title: 'something',
              },
            },
          ],
          statusCode: 400,
          response: expectNamespaceSpecifiedBadRequest,
        },
      },
    });

    bulkCreateTest('in the default space', {
      ...SPACES.DEFAULT,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(SPACES.DEFAULT.spaceId),
        },
        includingSpace: {
          statusCode: 200,
          response: expectBadRequestForHiddenType,
        },
        custom: {
          description: 'when a namespace is specified on the saved object',
          requestBody: [
            {
              type: 'visualization',
              namespace: 'space_1',
              attributes: {
                title: 'something',
              },
            },
          ],
          statusCode: 400,
          response: expectNamespaceSpecifiedBadRequest,
        },
      },
    });
  });
}
