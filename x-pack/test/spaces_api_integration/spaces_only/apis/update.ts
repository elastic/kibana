/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { updateTestSuiteFactory } from '../../common/suites/update';

// tslint:disable:no-default-export
export default function updateSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { updateTest, createExpectResult, createExpectNotFoundResult } = updateTestSuiteFactory(
    esArchiver,
    supertestWithoutAuth
  );

  describe('update', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach(scenario => {
      updateTest(`can update space_1 from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          alreadyExists: {
            space: {
              name: 'space 1',
              id: 'space_1',
              description: 'a description',
              color: '#5c5959',
              _reserved: true,
            },
            statusCode: 200,
            response: createExpectResult({
              name: 'space 1',
              id: 'space_1',
              description: 'a description',
              color: '#5c5959',
            }),
          },
          newSpace: {
            space: {
              name: 'marketing',
              id: 'marketing',
              description: 'a description',
              color: '#5c5959',
            },
            statusCode: 404,
            response: createExpectNotFoundResult('marketing'),
          },
        },
      });
    });
  });
}
