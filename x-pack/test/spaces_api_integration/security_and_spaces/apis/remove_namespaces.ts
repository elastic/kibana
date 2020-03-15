/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import {
  testCaseFailures,
  getTestScenarios,
} from '../../../saved_object_api_integration/common/lib/space_test_utils';
import { TestUser } from '../../../saved_object_api_integration/common/lib/types';
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../../common/lib/saved_object_test_cases';
import { TestInvoker } from '../../common/lib/types';
import {
  removeNamespacesTestSuiteFactory,
  RemoveNamespacesTestDefinition,
} from '../../common/suites/remove_namespaces';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;
const fail400 = (param: string, condition?: boolean): { failure?: 400; fail400Param?: string } =>
  condition !== false ? { failure: 400, fail400Param: param } : {};

const createTestCases = (spaceId: string) => {
  const _fail400 = (condition?: boolean) => fail400(spaceId, condition);
  const namespaces = [spaceId];
  // Test cases to check removing the target namespace from different saved objects
  const singleSpace = [
    { id: CASES.DEFAULT_SPACE_ONLY.id, namespaces, ..._fail400(spaceId !== DEFAULT_SPACE_ID) },
    { id: CASES.SPACE_1_ONLY.id, namespaces, ..._fail400(spaceId !== SPACE_1_ID) },
    { id: CASES.SPACE_2_ONLY.id, namespaces, ..._fail400(spaceId !== SPACE_2_ID) },
    { id: CASES.DEFAULT_AND_SPACE_1.id, namespaces, ..._fail400(spaceId === SPACE_2_ID) },
    { id: CASES.DEFAULT_AND_SPACE_2.id, namespaces, ..._fail400(spaceId === SPACE_1_ID) },
    { id: CASES.SPACE_1_AND_SPACE_2.id, namespaces, ..._fail400(spaceId === DEFAULT_SPACE_ID) },
    { id: CASES.ALL_SPACES.id, namespaces },
    { id: CASES.DOES_NOT_EXIST.id, namespaces, ...fail404() },
  ];
  // Test cases to check removing all existing namespaces from different saved objects that exist in multiple spaces
  // These are non-exhaustive, they only check cases for removing all namespaces from a saved object
  // More permutations are covered in the corresponding spaces_only test suite
  const multipleSpaces = [
    { ...CASES.DEFAULT_AND_SPACE_1, ...fail400(spaceId, spaceId !== SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_2, ...fail400(spaceId, spaceId !== SPACE_1_ID) },
    { ...CASES.SPACE_1_AND_SPACE_2, ...fail400(spaceId, spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.ALL_SPACES, ...fail400(spaceId) },
  ].map(({ id, existingNamespaces, failure }) => ({
    id,
    namespaces: existingNamespaces, // attempt to remove all of the existing namespaces
    failure, // if this was not forbidden, each of these was already removed from the target space in the above test cases
  }));
  const allCases = singleSpace.concat(multipleSpaces);
  return { singleSpace, multipleSpaces, allCases };
};

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = removeNamespacesTestSuiteFactory(
    esArchiver,
    supertest
  );
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
      const _addTests = (user: TestUser, tests: RemoveNamespacesTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.readAtSpace,
        users.allAtOtherSpace,
      ].forEach(user => {
        _addTests(user, unauthorized);
      });
      _addTests(users.allAtSpace, authorizedThisSpace);
      [users.dualAll, users.allGlobally, users.superuser].forEach(user => {
        _addTests(user, authorizedGlobally);
      });
    });
  });
}
