/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases } from '../../common/suites/find';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = (spaceId: string, crossSpaceSearch?: string[]) => {
  const cases = getTestCases({ currentSpace: spaceId, crossSpaceSearch });
  return Object.values(cases);
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = findTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string, crossSpaceSearch?: string[]) => {
    const testCases = createTestCases(spaceId, crossSpaceSearch);
    return createTestDefinitions(testCases, false);
  };

  describe('_find', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const currentSpaceTests = createTests(spaceId);
      const explicitCrossSpaceTests = createTests(spaceId, [
        DEFAULT_SPACE_ID,
        SPACE_1_ID,
        SPACE_2_ID,
      ]);
      const wildcardCrossSpaceTests = createTests(spaceId, ['*']);
      addTests(`within the ${spaceId} space`, {
        spaceId,
        tests: [...currentSpaceTests, ...explicitCrossSpaceTests, ...wildcardCrossSpaceTests],
      });
    });
  });
}
