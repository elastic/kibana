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
  addNamespacesTestSuiteFactory,
  AddNamespacesTestDefinition,
} from '../../common/suites/add_namespaces';

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
  return [
    // Test cases to check adding the target namespace to different saved objects
    { ...CASES.DEFAULT_SPACE_ONLY, namespaces, ..._fail400(spaceId === DEFAULT_SPACE_ID) },
    { ...CASES.SPACE_1_ONLY, namespaces, ..._fail400(spaceId === SPACE_1_ID) },
    { ...CASES.SPACE_2_ONLY, namespaces, ..._fail400(spaceId === SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_1, namespaces, ..._fail400(spaceId !== SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_2, namespaces, ..._fail400(spaceId !== SPACE_1_ID) },
    { ...CASES.SPACE_1_AND_SPACE_2, namespaces, ..._fail400(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.ALL_SPACES, namespaces, ..._fail400() },
    { ...CASES.DOES_NOT_EXIST, namespaces, ...fail404() },
    // Test cases to check adding namespaces to different saved objects that exist in one space
    // These are non-exhaustive, they only check cases for adding two additional namespaces to a saved object
    // More permutations are covered in the corresponding spaces_only test suite
    {
      ...CASES.DEFAULT_SPACE_ONLY,
      namespaces: [SPACE_1_ID, SPACE_2_ID],
      ..._fail400(spaceId !== DEFAULT_SPACE_ID), // fail if we already added this space in the test case above
    },
    {
      ...CASES.SPACE_1_ONLY,
      namespaces: [DEFAULT_SPACE_ID, SPACE_2_ID],
      ..._fail400(spaceId !== SPACE_1_ID), // fail if we already added this space in the test case above
    },
    {
      ...CASES.SPACE_2_ONLY,
      namespaces: [DEFAULT_SPACE_ID, SPACE_1_ID],
      ..._fail400(spaceId !== SPACE_2_ID), // fail if we already added this space in the test case above
    },
  ];
};
const calculateSingleSpaceAuthZ = (
  testCases: ReturnType<typeof createTestCases>,
  spaceId: string
) => {
  const targetsOtherSpace = testCases.filter(
    x => !x.namespaces.includes(spaceId) || x.namespaces.length > 1
  );
  const tmp = testCases.filter(x => x.namespaces === [spaceId]); // doesn't target other space
  const doesntExistInSpace = tmp.filter(x => !x.existingNamespaces.includes(spaceId));
  const existsInThisSpace = tmp.filter(x => x.existingNamespaces.includes(spaceId));
  return { targetsOtherSpace, doesntExistInSpace, existsInThisSpace };
};
// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = addNamespacesTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    const thisSpace = calculateSingleSpaceAuthZ(testCases, spaceId);
    const otherSpaceId = spaceId === DEFAULT_SPACE_ID ? SPACE_1_ID : DEFAULT_SPACE_ID;
    const otherSpace = calculateSingleSpaceAuthZ(testCases, otherSpaceId);
    return {
      unauthorized: createTestDefinitions(testCases, true, { fail403Param: 'create' }),
      authorizedInSpace: [
        createTestDefinitions(thisSpace.targetsOtherSpace, true, { fail403Param: 'create' }),
        createTestDefinitions(thisSpace.doesntExistInSpace, true, { fail403Param: 'update' }),
        createTestDefinitions(thisSpace.existsInThisSpace, false),
      ].flat(),
      authorizedInOtherSpace: [
        createTestDefinitions(otherSpace.targetsOtherSpace, true, { fail403Param: 'create' }),
        createTestDefinitions(otherSpace.doesntExistInSpace, true, { fail403Param: 'update' }),
        createTestDefinitions(otherSpace.existsInThisSpace, false),
      ].flat(),
      authorized: createTestDefinitions(testCases, false),
    };
  };

  describe('_share_saved_object_add', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` targeting the ${spaceId} space`;
      const { unauthorized, authorizedInSpace, authorizedInOtherSpace, authorized } = createTests(
        spaceId
      );
      const _addTests = (user: TestUser, tests: AddNamespacesTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.readAtSpace,
      ].forEach(user => {
        _addTests(user, unauthorized);
      });
      _addTests(users.allAtSpace, authorizedInSpace);
      _addTests(users.allAtOtherSpace, authorizedInOtherSpace);
      [users.dualAll, users.allGlobally, users.superuser].forEach(user => {
        _addTests(user, authorized);
      });
    });
  });
}
