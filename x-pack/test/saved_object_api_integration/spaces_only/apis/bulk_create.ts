/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES, ALL_SPACES_ID } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkCreateTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/bulk_create';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;
const unresolvableConflict = (condition?: boolean) =>
  condition !== false ? { fail409Param: 'unresolvableConflict' } : {};

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const expectedNamespaces = [spaceId]; // newly created objects should have this `namespaces` array in their return value
  return [
    {
      ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
      ...fail409(!overwrite && spaceId === DEFAULT_SPACE_ID),
      expectedNamespaces,
    },
    {
      ...CASES.SINGLE_NAMESPACE_SPACE_1,
      ...fail409(!overwrite && spaceId === SPACE_1_ID),
      expectedNamespaces,
    },
    {
      ...CASES.SINGLE_NAMESPACE_SPACE_2,
      ...fail409(!overwrite && spaceId === SPACE_2_ID),
      expectedNamespaces,
    },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...fail409(!overwrite) },
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...fail409(!overwrite || (spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID)),
      ...unresolvableConflict(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
      ...fail409(!overwrite || spaceId !== SPACE_1_ID),
      ...unresolvableConflict(spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
      ...fail409(!overwrite || spaceId !== SPACE_2_ID),
      ...unresolvableConflict(spaceId !== SPACE_2_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
      ...fail409(!overwrite || spaceId !== DEFAULT_SPACE_ID),
      ...unresolvableConflict(spaceId !== DEFAULT_SPACE_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
      ...fail409(!overwrite || spaceId !== SPACE_1_ID),
      ...unresolvableConflict(spaceId !== SPACE_1_ID),
    },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    { ...CASES.HIDDEN, ...fail400() },
    { ...CASES.NEW_SINGLE_NAMESPACE_OBJ, expectedNamespaces },
    { ...CASES.NEW_MULTI_NAMESPACE_OBJ, expectedNamespaces },
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
    {
      ...CASES.INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE,
      initialNamespaces: ['x', 'y'],
      ...fail400(), // cannot be created in multiple spaces
    },
    CASES.INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE, // second try creates it in a single other space, which is valid
    {
      ...CASES.INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE,
      initialNamespaces: [ALL_SPACES_ID],
      ...fail400(), // cannot be created in multiple spaces
    },
    CASES.INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE, // second try creates it in a single other space, which is valid
    CASES.INITIAL_NS_MULTI_NAMESPACE_OBJ_EACH_SPACE,
    CASES.INITIAL_NS_MULTI_NAMESPACE_OBJ_ALL_SPACES,
  ];
};

export default function (context: FtrProviderContext) {
  const { addTests, createTestDefinitions } = bulkCreateTestSuiteFactory(context, false);
  const createTests = (overwrite: boolean, spaceId: string) => {
    const testCases = createTestCases(overwrite, spaceId);
    return createTestDefinitions(testCases, false, overwrite, {
      spaceId,
      singleRequest: true,
    });
  };

  describe('_bulk_create', () => {
    getTestScenarios([false, true]).spaces.forEach(({ spaceId, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const tests = createTests(overwrite!, spaceId);
      addTests(`within the ${spaceId} space${suffix}`, { spaceId, tests });
    });
  });
}
