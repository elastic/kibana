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
import { TestUser } from '../../../saved_object_api_integration/common/lib/types';
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../../common/lib/saved_object_test_cases';
import { TestInvoker } from '../../common/lib/types';
import {
  shareRemoveTestSuiteFactory,
  ShareRemoveTestCase,
  ShareRemoveTestDefinition,
} from '../../common/suites/share_remove';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  // Test cases to check removing the target namespace from different saved objects
  let namespaces = [spaceId];
  const singleSpace = [
    { id: CASES.DEFAULT_SPACE_ONLY.id, namespaces, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { id: CASES.SPACE_1_ONLY.id, namespaces, ...fail404(spaceId !== SPACE_1_ID) },
    { id: CASES.SPACE_2_ONLY.id, namespaces, ...fail404(spaceId !== SPACE_2_ID) },
    { id: CASES.DEFAULT_AND_SPACE_1.id, namespaces, ...fail404(spaceId === SPACE_2_ID) },
    { id: CASES.DEFAULT_AND_SPACE_2.id, namespaces, ...fail404(spaceId === SPACE_1_ID) },
    { id: CASES.SPACE_1_AND_SPACE_2.id, namespaces, ...fail404(spaceId === DEFAULT_SPACE_ID) },
    { id: CASES.ALL_SPACES.id, namespaces },
    { id: CASES.DOES_NOT_EXIST.id, namespaces, ...fail404() },
  ] as ShareRemoveTestCase[];

  // Test cases to check removing all three namespaces from different saved objects that exist in two spaces
  // These are non-exhaustive, they only check some cases -- each object will result in a 404, either because
  // it never existed in the target namespace, or it was removed in one of the test cases above
  // More permutations are covered in the corresponding spaces_only test suite
  namespaces = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
  const multipleSpaces = [
    { id: CASES.DEFAULT_AND_SPACE_1.id, namespaces, ...fail404() },
    { id: CASES.DEFAULT_AND_SPACE_2.id, namespaces, ...fail404() },
    { id: CASES.SPACE_1_AND_SPACE_2.id, namespaces, ...fail404() },
  ] as ShareRemoveTestCase[];

  const allCases = singleSpace.concat(multipleSpaces);
  return { singleSpace, multipleSpaces, allCases };
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = shareRemoveTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const { singleSpace, multipleSpaces, allCases } = createTestCases(spaceId);
    return {
      unauthorized: createTestDefinitions(allCases, true),
      authorizedThisSpace: [
        createTestDefinitions(singleSpace, false),
        createTestDefinitions(multipleSpaces, true),
      ].flat(),
      authorizedGlobally: createTestDefinitions(allCases, false),
    };
  };

  describe('_share_saved_object_remove', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` targeting the ${spaceId} space`;
      const { unauthorized, authorizedThisSpace, authorizedGlobally } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: ShareRemoveTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.readAtSpace,
        users.allAtOtherSpace,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });
      _addTests(users.allAtSpace, authorizedThisSpace);
      [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
        _addTests(user, authorizedGlobally);
      });
    });
  });
}
