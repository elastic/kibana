/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases } from '../../common/suites/find';

const createTestCases = (spaceId: string, crossSpaceSearch: string[]) => {
  const cases = getTestCases({ currentSpace: spaceId, crossSpaceSearch });
  return Object.values(cases);
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = findTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string, crossSpaceSearch: string[]) => {
    const testCases = createTestCases(spaceId, crossSpaceSearch);
    return createTestDefinitions(testCases, false);
  };

  describe('_find', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const currentSpaceTests = createTests(spaceId, []);
      const explicitCrossSpaceTests = createTests(spaceId, ['default', 'space_1', 'space_2']);
      const wildcardCrossSpaceTests = createTests(spaceId, ['*']);
      addTests(`within the ${spaceId} space`, {
        spaceId,
        tests: [...currentSpaceTests, ...explicitCrossSpaceTests, ...wildcardCrossSpaceTests],
      });
    });
  });
}
