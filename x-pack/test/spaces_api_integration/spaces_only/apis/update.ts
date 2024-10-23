/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest } from 'supertest';

import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { SPACES } from '../../common/lib/spaces';
import { updateTestSuiteFactory } from '../../common/suites/update';

// eslint-disable-next-line import/no-default-export
export default function updateSpaceTestSuite({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { updateTest, expectAlreadyExistsResult, expectDefaultSpaceResult, expectNotFound } =
    updateTestSuiteFactory(esArchiver, supertestWithoutAuth as unknown as SuperTest<any>);

  describe('update', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      updateTest(`can update from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          alreadyExists: {
            statusCode: 200,
            response: expectAlreadyExistsResult,
          },
          defaultSpace: {
            statusCode: 200,
            response: expectDefaultSpaceResult,
          },
          newSpace: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });
    });
  });
}
