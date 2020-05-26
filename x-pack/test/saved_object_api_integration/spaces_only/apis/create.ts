/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/create';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;

const createTestCases = (overwrite: boolean, spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  {
    ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
    ...fail409(!overwrite && spaceId === DEFAULT_SPACE_ID),
  },
  { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail409(!overwrite && spaceId === SPACE_1_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail409(!overwrite && spaceId === SPACE_2_ID) },
  {
    ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    ...fail409(!overwrite || (spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID)),
  },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail409(!overwrite || spaceId !== SPACE_1_ID) },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail409(!overwrite || spaceId !== SPACE_2_ID) },
  { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
  { ...CASES.HIDDEN, ...fail400() },
  CASES.NEW_SINGLE_NAMESPACE_OBJ,
  CASES.NEW_MULTI_NAMESPACE_OBJ,
  CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions } = createTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (overwrite: boolean, spaceId: string) => {
    const testCases = createTestCases(overwrite, spaceId);
    return createTestDefinitions(testCases, false, overwrite, { spaceId });
  };

  describe('_create', () => {
    getTestScenarios([false, true]).spaces.forEach(({ spaceId, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const tests = createTests(overwrite!, spaceId);
      addTests(`within the ${spaceId} space${suffix}`, { spaceId, tests });
    });
  });
}
