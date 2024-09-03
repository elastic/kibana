/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuperTest } from 'supertest';
import { SPACES } from '../../common/lib/spaces';
import { getTestSuiteFactory } from '../../common/suites/get';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getSpaceTestSuite({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { getTest, createExpectResults, createExpectNotFoundResult, nonExistantSpaceId } =
    getTestSuiteFactory(esArchiver, supertestWithoutAuth as unknown as SuperTest<any>);

  describe('get', () => {
    // valid spaces
    [
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        spaceId: SPACES.SPACE_1.spaceId,
      },
      {
        currentSpaceId: SPACES.SPACE_1.spaceId,
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        currentSpaceId: SPACES.SPACE_1.spaceId,
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      getTest(`can access ${scenario.spaceId} from within the ${scenario.currentSpaceId} space`, {
        spaceId: scenario.spaceId,
        currentSpaceId: scenario.currentSpaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectResults(scenario.spaceId),
          },
        },
      });
    });

    // invalid spaces
    [
      {
        currentSpaceId: SPACES.DEFAULT.spaceId,
        spaceId: nonExistantSpaceId,
      },
    ].forEach((scenario) => {
      getTest(`can't access ${scenario.spaceId} from within the ${scenario.currentSpaceId} space`, {
        spaceId: scenario.spaceId,
        currentSpaceId: scenario.currentSpaceId,
        tests: {
          default: {
            statusCode: 404,
            response: createExpectNotFoundResult(),
          },
        },
      });
    });
  });
}
