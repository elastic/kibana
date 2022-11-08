/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES, ALL_SPACES_ID } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkGetTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/bulk_get';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
  CASES.MULTI_NAMESPACE_ALL_SPACES,
  {
    ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
  },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
  {
    ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
    ...fail404(spaceId !== DEFAULT_SPACE_ID),
  },
  { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
  CASES.NAMESPACE_AGNOSTIC,
  { ...CASES.HIDDEN, ...fail400() },
  { ...CASES.DOES_NOT_EXIST, ...fail404() },
  {
    ...CASES.SINGLE_NAMESPACE_SPACE_2,
    namespaces: ['x', 'y'],
    ...fail400(), // cannot be searched for in multiple spaces
  },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, namespaces: [SPACE_2_ID] }, // second try searches for it in a single other space, which is valid
  {
    ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
    namespaces: [ALL_SPACES_ID],
    ...fail400(), // cannot be searched for in multiple spaces
  },
  { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1, namespaces: [SPACE_1_ID] }, // second try searches for it in a single other space, which is valid
  { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, namespaces: [SPACE_2_ID], ...fail404() },
  { ...CASES.MULTI_NAMESPACE_ALL_SPACES, namespaces: [SPACE_2_ID, 'x'] }, // unknown space is allowed / ignored
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, namespaces: [ALL_SPACES_ID] },
];

export default function (context: FtrProviderContext) {
  const { addTests, createTestDefinitions } = bulkGetTestSuiteFactory(context);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return createTestDefinitions(testCases, false, { singleRequest: true });
  };

  describe('_bulk_get', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
