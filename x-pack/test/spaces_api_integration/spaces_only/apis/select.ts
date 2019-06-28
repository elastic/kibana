/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { selectTestSuiteFactory } from '../../common/suites/select';

// eslint-disable-next-line import/no-default-export
export default function selectSpaceTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    selectTest,
    createExpectSpaceResponse,
    createExpectNotFoundResult,
    nonExistantSpaceId,
  } = selectTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('select', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        otherSpaceId: SPACES.SPACE_1.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        otherSpaceId: SPACES.SPACE_2.spaceId,
      },
    ].forEach(scenario => {
      selectTest(`can select ${scenario.otherSpaceId} from ${scenario.spaceId}`, {
        currentSpaceId: scenario.spaceId,
        selectSpaceId: scenario.otherSpaceId,
        tests: {
          default: {
            statusCode: 200,
            response: createExpectSpaceResponse(scenario.otherSpaceId),
          },
        },
      });
    });

    describe('non-existant space', () => {
      [
        {
          spaceId: SPACES.DEFAULT.spaceId,
          otherSpaceId: nonExistantSpaceId,
        },
        {
          spaceId: SPACES.SPACE_1.spaceId,
          otherSpaceId: nonExistantSpaceId,
        },
      ].forEach(scenario => {
        selectTest(`cannot select non-existant space from ${scenario.spaceId}`, {
          currentSpaceId: scenario.spaceId,
          selectSpaceId: scenario.otherSpaceId,
          tests: {
            default: {
              statusCode: 404,
              response: createExpectNotFoundResult(),
            },
          },
        });
      });
    });
  });
}
