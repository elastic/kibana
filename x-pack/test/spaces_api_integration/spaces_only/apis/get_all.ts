/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest } from 'supertest';

import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { SPACES } from '../../common/lib/spaces';
import { getAllTestSuiteFactory } from '../../common/suites/get_all';

// eslint-disable-next-line import/no-default-export
export default function getAllSpacesTestSuite({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { getAllTest, createExpectResults } = getAllTestSuiteFactory(
    esArchiver,
    supertestWithoutAuth as unknown as SuperTest<any>
  );

  describe('get all', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      getAllTest(`can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2', 'space_3'),
          },
          copySavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2', 'space_3'),
          },
          shareSavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2', 'space_3'),
          },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2', 'space_3'),
          },
        },
      });
    });
  });
}
