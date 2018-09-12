/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { updateTestSuiteFactory } from '../../common/suites/update';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    const {
      expectSpaceAwareResults,
      expectNotFound,
      expectNotSpaceAwareResults,
      updateTest,
    } = updateTestSuiteFactory(esArchiver, supertest);

    updateTest(`in the default space`, {
      ...SPACES.DEFAULT,
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
          response: expectNotFound,
        },
      },
    });

    updateTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
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
          response: expectNotFound,
        },
      },
    });
  });
}
