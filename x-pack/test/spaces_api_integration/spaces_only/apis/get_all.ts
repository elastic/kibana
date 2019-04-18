/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { getAllTestSuiteFactory } from '../../common/suites/get_all';

// eslint-disable-next-line import/no-default-export
export default function getAllSpacesTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { getAllTest, createExpectResults } = getAllTestSuiteFactory(
    esArchiver,
    supertestWithoutAuth
  );

  describe('get all', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach(scenario => {
      getAllTest(`can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
        },
      });
    });
  });
}
