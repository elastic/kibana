/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { exportTestSuiteFactory, getTestCases } from '../../common/suites/export';

const createTestCases = (spaceId: string) => {
  const cases = getTestCases(spaceId);
  return Object.values(cases);
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = exportTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return createTestDefinitions(testCases, false);
  };

  describe('_export', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
