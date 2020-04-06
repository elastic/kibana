/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import {
  testCaseFailures,
  getTestScenarios,
} from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import { TestInvoker } from '../../common/lib/types';
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../../common/lib/saved_object_test_cases';
import { shareRemoveTestSuiteFactory } from '../../common/suites/share_remove';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

/**
 * Single-namespace test cases
 * @param spaceId the namespace to remove from each saved object
 */
const createSingleTestCases = (spaceId: string) => {
  const namespaces = [spaceId];
  return [
    { ...CASES.DEFAULT_SPACE_ONLY, namespaces, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SPACE_1_ONLY, namespaces, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SPACE_2_ONLY, namespaces, ...fail404(spaceId !== SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_1, namespaces, ...fail404(spaceId === SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_2, namespaces, ...fail404(spaceId === SPACE_1_ID) },
    { ...CASES.SPACE_1_AND_SPACE_2, namespaces, ...fail404(spaceId === DEFAULT_SPACE_ID) },
    { ...CASES.ALL_SPACES, namespaces },
    { ...CASES.DOES_NOT_EXIST, namespaces, ...fail404() },
  ];
};
/**
 * Multi-namespace test cases
 * These are non-exhaustive, but they check different permutations of saved objects and spaces to remove
 */
const createMultiTestCases = () => {
  const nonExistentSpaceId = 'does_not_exist'; // space that doesn't exist
  let id = CASES.DEFAULT_SPACE_ONLY.id;
  const one = [
    { id, namespaces: [nonExistentSpaceId] },
    { id, namespaces: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID] },
    { id, namespaces: [DEFAULT_SPACE_ID], ...fail404() }, // this saved object no longer exists
  ];
  id = CASES.DEFAULT_AND_SPACE_1.id;
  const two = [
    { id, namespaces: [DEFAULT_SPACE_ID, nonExistentSpaceId] },
    // this saved object will not be found in the context of the current namespace ('default')
    { id, namespaces: [DEFAULT_SPACE_ID], ...fail404() }, // this object's namespaces no longer contains DEFAULT_SPACE_ID
    { id, namespaces: [SPACE_1_ID], ...fail404() }, // this object's namespaces does contain SPACE_1_ID
  ];
  id = CASES.ALL_SPACES.id;
  const three = [
    { id, namespaces: [DEFAULT_SPACE_ID, SPACE_1_ID, nonExistentSpaceId] },
    // this saved object will not be found in the context of the current namespace ('default')
    { id, namespaces: [DEFAULT_SPACE_ID], ...fail404() }, // this object's namespaces no longer contains DEFAULT_SPACE_ID
    { id, namespaces: [SPACE_1_ID], ...fail404() }, // this object's namespaces no longer contains SPACE_1_ID
    { id, namespaces: [SPACE_2_ID], ...fail404() }, // this object's namespaces does contain SPACE_2_ID
  ];
  return { one, two, three };
};

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = shareRemoveTestSuiteFactory(esArchiver, supertest);
  const createSingleTests = (spaceId: string) => {
    const testCases = createSingleTestCases(spaceId);
    return createTestDefinitions(testCases, false);
  };
  const createMultiTests = () => {
    const testCases = createMultiTestCases();
    return {
      one: createTestDefinitions(testCases.one, false),
      two: createTestDefinitions(testCases.two, false),
      three: createTestDefinitions(testCases.three, false),
    };
  };

  describe('_share_saved_object_remove', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createSingleTests(spaceId);
      addTests(`targeting the ${spaceId} space`, { spaceId, tests });
    });
    const { one, two, three } = createMultiTests();
    addTests('for a saved object in the default space', { tests: one });
    addTests('for a saved object in the default and space_1 spaces', { tests: two });
    addTests('for a saved object in the default, space_1, and space_2 spaces', { tests: three });
  });
}
