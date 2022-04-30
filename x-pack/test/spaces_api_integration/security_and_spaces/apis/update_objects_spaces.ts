/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import {
  testCaseFailures,
  getTestScenarios,
} from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import { TestUser } from '../../../saved_object_api_integration/common/lib/types';
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../../common/lib/saved_object_test_cases';
import {
  updateObjectsSpacesTestSuiteFactory,
  UpdateObjectsSpacesTestDefinition,
  UpdateObjectsSpacesTestCase,
} from '../../common/suites/update_objects_spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

const createTestCases = (spaceId: string): UpdateObjectsSpacesTestCase[] => {
  const eachSpace = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
  // Note: we intentionally exclude ALIAS_DELETION test cases because they are already covered in spaces_only test suite, and there is no
  // authZ-specific logic that affects alias deletion, all of that happens at the Saved Objects Repository level.
  return [
    // Test case to check adding and removing all spaces ("*") to a saved object
    {
      objects: [CASES.EACH_SPACE],
      spacesToAdd: ['*'],
      spacesToRemove: [],
    },
    {
      objects: [{ id: CASES.EACH_SPACE.id, existingNamespaces: [...eachSpace, '*'] }],
      spacesToAdd: [],
      spacesToRemove: ['*'],
    },

    // Test cases to check adding and removing multiple namespaces to different saved objects that exist in one space
    // These are non-exhaustive, they only check cases for adding two additional namespaces to a saved object
    // More permutations are covered in the corresponding spaces_only test suite
    {
      objects: [{ ...CASES.DEFAULT_ONLY, ...fail404(spaceId !== DEFAULT_SPACE_ID) }],
      spacesToAdd: [SPACE_1_ID, SPACE_2_ID],
      spacesToRemove: [],
    },
    {
      objects: [{ ...CASES.SPACE_1_ONLY, ...fail404(spaceId !== SPACE_1_ID) }],
      spacesToAdd: [DEFAULT_SPACE_ID, SPACE_2_ID],
      spacesToRemove: [],
    },
    {
      objects: [{ ...CASES.SPACE_2_ONLY, ...fail404(spaceId !== SPACE_2_ID) }],
      spacesToAdd: [DEFAULT_SPACE_ID, SPACE_1_ID],
      spacesToRemove: [],
    },
    {
      objects: [
        {
          id: CASES.DEFAULT_ONLY.id,
          existingNamespaces: eachSpace,
          ...fail404(spaceId !== DEFAULT_SPACE_ID),
        },
        {
          id: CASES.SPACE_1_ONLY.id,
          existingNamespaces: eachSpace,
          ...fail404(spaceId !== SPACE_1_ID),
        },
        {
          id: CASES.SPACE_2_ONLY.id,
          existingNamespaces: eachSpace,
          ...fail404(spaceId !== SPACE_2_ID),
        },
      ],
      spacesToAdd: [],
      spacesToRemove: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
    },

    // Test cases to check adding and removing the target namespace to different saved objects
    {
      objects: [
        { ...CASES.DEFAULT_AND_SPACE_1, ...fail404(spaceId === SPACE_2_ID) },
        { ...CASES.DEFAULT_AND_SPACE_2, ...fail404(spaceId === SPACE_1_ID) },
        { ...CASES.SPACE_1_AND_SPACE_2, ...fail404(spaceId === DEFAULT_SPACE_ID) },
        CASES.ALL_SPACES,
        { ...CASES.DOES_NOT_EXIST, ...fail404() },
      ],
      spacesToAdd: [spaceId],
      spacesToRemove: [],
    },
    {
      objects: [
        { ...CASES.DEFAULT_AND_SPACE_1, ...fail404(spaceId === SPACE_2_ID) },
        { ...CASES.DEFAULT_AND_SPACE_2, ...fail404(spaceId === SPACE_1_ID) },
        { ...CASES.SPACE_1_AND_SPACE_2, ...fail404(spaceId === DEFAULT_SPACE_ID) },
        { id: CASES.ALL_SPACES.id, existingNamespaces: ['*', spaceId] },
        { ...CASES.DOES_NOT_EXIST, ...fail404() },
      ],
      spacesToAdd: [],
      spacesToRemove: [spaceId],
    },
  ];
};
const calculateSingleSpaceAuthZ = (testCases: UpdateObjectsSpacesTestCase[], spaceId: string) => {
  const targetsThisSpace: UpdateObjectsSpacesTestCase[] = [];
  const targetsOtherSpace: UpdateObjectsSpacesTestCase[] = [];

  for (const testCase of testCases) {
    const { spacesToAdd, spacesToRemove } = testCase;
    const spacesToAddOrRemove = [...spacesToAdd, ...spacesToRemove];
    if (spacesToAddOrRemove.length === 1 && spacesToAddOrRemove[0] === spaceId) {
      targetsThisSpace.push(testCase);
    } else {
      targetsOtherSpace.push(testCase);
    }
  }
  return { targetsThisSpace, targetsOtherSpace };
};
// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = updateObjectsSpacesTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    const { targetsThisSpace, targetsOtherSpace } = calculateSingleSpaceAuthZ(testCases, spaceId);
    return {
      unauthorized: createTestDefinitions(testCases, true),
      authorizedThisSpace: [
        createTestDefinitions(targetsOtherSpace, true),
        createTestDefinitions(targetsThisSpace, false, { authorizedSpace: spaceId }),
      ].flat(),
      authorizedGlobally: createTestDefinitions(testCases, false),
    };
  };

  describe('_update_objects_spaces', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` targeting the ${spaceId} space`;
      const { unauthorized, authorizedThisSpace, authorizedGlobally } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: UpdateObjectsSpacesTestDefinition[]) => {
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
