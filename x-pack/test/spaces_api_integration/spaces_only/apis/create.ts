/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { createTestSuiteFactory } from '../../common/suites/create';

// eslint-disable-next-line import/no-default-export
export default function createSpacesOnlySuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    expectNewSpaceResult,
    expectConflictResponse,
    expectReservedSpecifiedResult,
  } = createTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('create', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      createTest(`from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          newSpace: {
            statusCode: 200,
            response: expectNewSpaceResult,
          },
          alreadyExists: {
            statusCode: 409,
            response: expectConflictResponse,
          },
          reservedSpecified: {
            statusCode: 200,
            response: expectReservedSpecifiedResult,
          },
        },
      });
    });
  });
}
