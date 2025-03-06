/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../../common/lib/spaces';
import { deleteTestSuiteFactory } from '../../../common/suites/delete.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function deleteSpaceTestSuite(context: DeploymentAgnosticFtrProviderContext) {
  const { deleteTest, expectEmptyResult, expectReservedSpaceResult, expectNotFound } =
    deleteTestSuiteFactory(context);

  describe('delete', () => {
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
      },
    ].forEach((scenario) => {
      deleteTest(`from the ${scenario.spaceId} space`, {
        spaceId: scenario.spaceId,
        tests: {
          exists: {
            statusCode: 204,
            response: expectEmptyResult,
          },
          reservedSpace: {
            statusCode: 400,
            response: expectReservedSpaceResult,
          },
          doesntExist: {
            statusCode: 404,
            response: expectNotFound,
          },
        },
      });
    });
  });
}
