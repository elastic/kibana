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
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../../common/lib/saved_object_test_cases';
import type { UpdateObjectsSpacesTestCase } from '../../common/suites/update_objects_spaces';
import { updateObjectsSpacesTestSuiteFactory } from '../../common/suites/update_objects_spaces';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

/**
 * Single-part test cases, which can be run in a single batch
 * @param spaceId the space in which the test will take place (and the space the object will be removed from)
 */
const createSinglePartTestCases = (spaceId: string) => {
  const spacesToAdd = ['some-space-id'];
  const spacesToRemove = [spaceId];
  return {
    objects: [
      { ...CASES.DEFAULT_ONLY, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
      { ...CASES.SPACE_1_ONLY, ...fail404(spaceId !== SPACE_1_ID) },
      { ...CASES.SPACE_2_ONLY, ...fail404(spaceId !== SPACE_2_ID) },
      { ...CASES.DEFAULT_AND_SPACE_1, ...fail404(spaceId === SPACE_2_ID) },
      { ...CASES.DEFAULT_AND_SPACE_2, ...fail404(spaceId === SPACE_1_ID) },
      { ...CASES.SPACE_1_AND_SPACE_2, ...fail404(spaceId === DEFAULT_SPACE_ID) },
      CASES.EACH_SPACE,
      CASES.ALL_SPACES,
      { ...CASES.DOES_NOT_EXIST, ...fail404() },
    ],
    spacesToAdd,
    spacesToRemove,
  };
};
/**
 * Multi-part test cases, which have to be run sequentially
 * These are non-exhaustive, but they check different permutations of saved objects and spaces to add
 */
const createMultiPartTestCases = () => {
  const nonExistentSpace = 'does_not_exist'; // space that doesn't exist
  const eachSpace = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];
  const group1: UpdateObjectsSpacesTestCase[] = [
    // These test cases ensure that aliases are deleted when objects are unshared.
    // For simplicity these are done separately, before the others.
    {
      objects: [
        {
          id: CASES.ALIAS_DELETE_INCLUSIVE.id,
          existingNamespaces: eachSpace,
          expectAliasDifference: -1, // one alias should have been deleted from space_2
        },
      ],
      spacesToAdd: [],
      spacesToRemove: [SPACE_2_ID],
    },
    {
      objects: [
        {
          id: CASES.ALIAS_DELETE_INCLUSIVE.id,
          existingNamespaces: [DEFAULT_SPACE_ID, SPACE_1_ID],
          expectAliasDifference: -1, // no aliases should have been deleted from space_1
        },
      ],
      spacesToAdd: [],
      spacesToRemove: [SPACE_1_ID],
    },
    {
      objects: [
        {
          id: CASES.ALIAS_DELETE_INCLUSIVE.id,
          existingNamespaces: [DEFAULT_SPACE_ID],
          expectAliasDifference: -2, // one alias should have been deleted from the default space
        },
      ],
      spacesToAdd: [],
      spacesToRemove: [DEFAULT_SPACE_ID],
    },
    {
      objects: [
        {
          id: CASES.ALIAS_DELETE_EXCLUSIVE.id,
          existingNamespaces: [SPACE_1_ID],
          expectAliasDifference: -3, // one alias should have been deleted from other_space
        },
      ],
      spacesToAdd: [SPACE_1_ID],
      spacesToRemove: ['*'],
    },
  ];
  const group2 = [
    // first, add this object to each space and remove it from nonExistentSpace
    // this will succeed even though the object already exists in the default space and it doesn't exist in nonExistentSpace
    { objects: [CASES.DEFAULT_ONLY], spacesToAdd: eachSpace, spacesToRemove: [nonExistentSpace] },
    // second, add this object to nonExistentSpace and all spaces, and remove it from the default space
    {
      objects: [{ id: CASES.DEFAULT_ONLY.id, existingNamespaces: eachSpace }],
      spacesToAdd: [nonExistentSpace, '*'],
      spacesToRemove: [DEFAULT_SPACE_ID],
    },
    // third, remove the object from all spaces
    // the object is still accessible in the context of the default space because it currently exists in all spaces
    {
      objects: [
        {
          id: CASES.DEFAULT_ONLY.id,
          existingNamespaces: [SPACE_1_ID, SPACE_2_ID, nonExistentSpace, '*'],
        },
      ],
      spacesToAdd: [],
      spacesToRemove: ['*'],
    },
    // fourth, remove the object from space_1
    // this will fail because, even though the object still exists, it no longer exists in the context of the default space
    {
      objects: [
        {
          id: CASES.DEFAULT_ONLY.id,
          existingNamespaces: [SPACE_1_ID, SPACE_2_ID, nonExistentSpace],
          ...fail404(),
        },
      ],
      spacesToAdd: [],
      spacesToRemove: [SPACE_1_ID],
    },
  ];
  const group3 = [
    // first, add this object to space_2 and remove it from space_1
    {
      objects: [CASES.DEFAULT_AND_SPACE_1],
      spacesToAdd: [SPACE_2_ID],
      spacesToRemove: [SPACE_1_ID],
    },
    // second, remove this object from the default space and space_2
    // since the object would no longer exist in any spaces, it will be deleted
    {
      objects: [
        { id: CASES.DEFAULT_AND_SPACE_1.id, existingNamespaces: [DEFAULT_SPACE_ID, SPACE_2_ID] },
      ],
      spacesToAdd: [],
      spacesToRemove: [DEFAULT_SPACE_ID, SPACE_1_ID],
    },
    // fourth, add the object to the default space
    // this will fail because the object no longer exists
    {
      objects: [{ id: CASES.DEFAULT_AND_SPACE_1.id, existingNamespaces: [], ...fail404() }],
      spacesToAdd: [DEFAULT_SPACE_ID],
      spacesToRemove: [],
    },
  ];
  return [...group1, ...group2, ...group3];
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = updateObjectsSpacesTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createSinglePartTests = (spaceId: string) => {
    const testCases = createSinglePartTestCases(spaceId);
    return createTestDefinitions(testCases, false);
  };
  const createMultiPartTests = () => {
    const testCases = createMultiPartTestCases();
    return createTestDefinitions(testCases, false);
  };

  describe('_update_objects_spaces', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createSinglePartTests(spaceId);
      addTests(`targeting the ${spaceId} space`, { spaceId, tests });
    });
    const multiPartTests = createMultiPartTests();
    addTests('multi-part tests in the default space', { tests: multiPartTests });
  });
}
