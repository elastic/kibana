/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { importTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/import';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;

const createTestCases = (spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail409(spaceId === DEFAULT_SPACE_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail409(spaceId === SPACE_1_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail409(spaceId === SPACE_2_ID) },
  { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail400() },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail400() },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail400() },
  { ...CASES.NAMESPACE_AGNOSTIC, ...fail409() },
  { ...CASES.HIDDEN, ...fail400() },
  CASES.NEW_SINGLE_NAMESPACE_OBJ,
  { ...CASES.NEW_MULTI_NAMESPACE_OBJ, ...fail400() },
  CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions } = importTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return createTestDefinitions(testCases, false, { spaceId, singleRequest: true });
  };

  describe('_import', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
