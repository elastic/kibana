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
import { shareAddTestSuiteFactory } from '../../common/suites/share_add';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

/**
 * Single-namespace test cases
 * @param spaceId the namespace to add to each saved object
 */
const createSingleTestCases = (spaceId: string) => {
  const namespaces = ['some-space-id'];
  return [
    { ...CASES.DEFAULT_ONLY, namespaces, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SPACE_1_ONLY, namespaces, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SPACE_2_ONLY, namespaces, ...fail404(spaceId !== SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_1, namespaces, ...fail404(spaceId === SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_2, namespaces, ...fail404(spaceId === SPACE_1_ID) },
    { ...CASES.SPACE_1_AND_SPACE_2, namespaces, ...fail404(spaceId === DEFAULT_SPACE_ID) },
    { ...CASES.EACH_SPACE, namespaces },
    { ...CASES.ALL_SPACES, namespaces },
    { ...CASES.DOES_NOT_EXIST, namespaces, ...fail404() },
  ];
};
/**
 * Multi-namespace test cases
 * These are non-exhaustive, but they check different permutations of saved objects and spaces to add
 */
const createMultiTestCases = () => {
  const eachSpace = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
  const allSpaces = ['*'];
  // for each of the cases below, test adding each space and all spaces to the object
  const one = [
    { id: CASES.DEFAULT_ONLY.id, namespaces: eachSpace },
    { id: CASES.DEFAULT_ONLY.id, namespaces: allSpaces },
  ];
  const two = [
    { id: CASES.DEFAULT_AND_SPACE_1.id, namespaces: eachSpace },
    { id: CASES.DEFAULT_AND_SPACE_1.id, namespaces: allSpaces },
  ];
  const three = [
    { id: CASES.EACH_SPACE.id, namespaces: eachSpace },
    { id: CASES.EACH_SPACE.id, namespaces: allSpaces },
  ];
  const four = [
    { id: CASES.ALL_SPACES.id, namespaces: eachSpace },
    { id: CASES.ALL_SPACES.id, namespaces: allSpaces },
  ];
  return { one, two, three, four };
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: TestInvoker) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = shareAddTestSuiteFactory(esArchiver, supertest);
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
      four: createTestDefinitions(testCases.four, false),
    };
  };

  describe('_share_saved_object_add', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createSingleTests(spaceId);
      addTests(`targeting the ${spaceId} space`, { spaceId, tests });
    });
    const { one, two, three, four } = createMultiTests();
    addTests('for a saved object in the default space', { tests: one });
    addTests('for a saved object in the default and space_1 spaces', { tests: two });
    addTests('for a saved object in the default, space_1, and space_2 spaces', { tests: three });
    addTests('for a saved object in all spaces', { tests: four });
  });
}
