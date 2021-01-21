/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { resolveTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/resolve';

const {
  SPACE_1: { spaceId: SPACE_1_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  CASES.EXACT_MATCH,
  { ...CASES.ALIAS_MATCH, ...fail404(spaceId !== SPACE_1_ID) },
  {
    ...CASES.CONFLICT,
    ...(spaceId !== SPACE_1_ID && { expectedOutcome: 'exactMatch' as 'exactMatch' }),
  },
  { ...CASES.DISABLED, ...fail404() },
  { ...CASES.HIDDEN, ...fail404() },
  { ...CASES.DOES_NOT_EXIST, ...fail404() },
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = resolveTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return createTestDefinitions(testCases, false, { spaceId });
  };

  describe('_resolve', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
