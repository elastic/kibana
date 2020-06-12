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
import { shareAddTestSuiteFactory, ShareAddTestDefinition } from '../../common/suites/share_add';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  const namespaces = [spaceId];
  return [
    // Test cases to check adding the target namespace to different saved objects
    { ...CASES.DEFAULT_SPACE_ONLY, namespaces, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SPACE_1_ONLY, namespaces, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SPACE_2_ONLY, namespaces, ...fail404(spaceId !== SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_1, namespaces, ...fail404(spaceId === SPACE_2_ID) },
    { ...CASES.DEFAULT_AND_SPACE_2, namespaces, ...fail404(spaceId === SPACE_1_ID) },
    { ...CASES.SPACE_1_AND_SPACE_2, namespaces, ...fail404(spaceId === DEFAULT_SPACE_ID) },
    { ...CASES.ALL_SPACES, namespaces },
    { ...CASES.DOES_NOT_EXIST, namespaces, ...fail404() },
    // Test cases to check adding multiple namespaces to different saved objects that exist in one space
    // These are non-exhaustive, they only check cases for adding two additional namespaces to a saved object
    // More permutations are covered in the corresponding spaces_only test suite
    {
      ...CASES.DEFAULT_SPACE_ONLY,
      namespaces: [SPACE_1_ID, SPACE_2_ID],
      ...fail404(spaceId !== DEFAULT_SPACE_ID),
    },
    {
      ...CASES.SPACE_1_ONLY,
      namespaces: [DEFAULT_SPACE_ID, SPACE_2_ID],
      ...fail404(spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.SPACE_2_ONLY,
      namespaces: [DEFAULT_SPACE_ID, SPACE_1_ID],
      ...fail404(spaceId !== SPACE_2_ID),
    },
  ];
};
const calculateSingleSpaceAuthZ = (
  testCases: ReturnType<typeof createTestCases>,
  spaceId: string
) => {
  const targetsOtherSpace = testCases.filter(
    (x) => !x.namespaces.includes(spaceId) || x.namespaces.length > 1
  );
  const tmp = testCases.filter((x) => !targetsOtherSpace.includes(x)); // doesn't target other space
  const doesntExistInThisSpace = tmp.filter((x) => !x.existingNamespaces.includes(spaceId));
  const existsInThisSpace = tmp.filter((x) => x.existingNamespaces.includes(spaceId));
  return { targetsOtherSpace, doesntExistInThisSpace, existsInThisSpace };
};
// eslint-disable-next-line import/no-default-export
export default function ({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = shareAddTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    const thisSpace = calculateSingleSpaceAuthZ(testCases, spaceId);
    const otherSpaceId = spaceId === DEFAULT_SPACE_ID ? SPACE_1_ID : DEFAULT_SPACE_ID;
    const otherSpace = calculateSingleSpaceAuthZ(testCases, otherSpaceId);
    return {
      unauthorized: createTestDefinitions(testCases, true, { fail403Param: 'create' }),
      authorizedInSpace: [
        createTestDefinitions(thisSpace.targetsOtherSpace, true, { fail403Param: 'create' }),
        createTestDefinitions(thisSpace.doesntExistInThisSpace, false),
        createTestDefinitions(thisSpace.existsInThisSpace, false),
      ].flat(),
      authorizedInOtherSpace: [
        createTestDefinitions(otherSpace.targetsOtherSpace, true, { fail403Param: 'create' }),
        // If the preflight GET request fails, it will return a 404 error; users who are authorized to create saved objects in the target
        // space(s) but are not authorized to update saved objects in this space will see a 403 error instead of 404. This is a safeguard to
        // prevent potential information disclosure of the spaces that a given saved object may exist in.
        createTestDefinitions(otherSpace.doesntExistInThisSpace, true, { fail403Param: 'update' }),
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
      const _addTests = (user: TestUser, tests: ShareAddTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.readAtSpace,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });
      _addTests(users.allAtSpace, authorizedInSpace);
      _addTests(users.allAtOtherSpace, authorizedInOtherSpace);
      [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}
