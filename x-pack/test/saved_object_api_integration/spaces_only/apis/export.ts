/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { exportTestSuiteFactory } from '../../common/suites/export';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const {
    expectTypeOrObjectsRequired,
    createExpectVisualizationResults,
    expectInvalidTypeSpecified,
    exportTest,
  } = exportTestSuiteFactory(esArchiver, supertest);

  describe('export', () => {
    exportTest('objects only within the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(SPACES.SPACE_1.spaceId),
        },
        hiddenType: {
          description: 'exporting space not allowed',
          statusCode: 400,
          response: expectInvalidTypeSpecified,
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('objects only within the current space (default)', {
      ...SPACES.DEFAULT,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(SPACES.DEFAULT.spaceId),
        },
        hiddenType: {
          description: 'exporting space not allowed',
          statusCode: 400,
          response: expectInvalidTypeSpecified,
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });
  });
}
