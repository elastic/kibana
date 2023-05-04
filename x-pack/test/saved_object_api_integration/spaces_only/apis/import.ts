/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  importTestSuiteFactory,
  importTestCaseFailures,
  TEST_CASES as CASES,
  SPECIAL_TEST_CASES,
} from '../../common/suites/import';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { failUnsupportedType, failConflict, failAmbiguousConflict, failMissingReferences } =
  importTestCaseFailures;
const destinationId = (condition?: boolean) =>
  condition !== false ? { successParam: 'destinationId' } : {};
const newCopy = () => ({ successParam: 'createNewCopy' });

const createNewCopiesTestCases = () => {
  // for each outcome, if failureType !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  return [
    ...Object.entries(CASES).map(([, val]) => ({ ...val, successParam: 'createNewCopies' })),
    { ...SPECIAL_TEST_CASES.HIDDEN, ...failUnsupportedType() }, // unsupported_type is an "unresolvable" error
    // Other special test cases are excluded because they can result in "resolvable" errors that will prevent the rest of the objects from
    // being created. The test suite assumes that when the createNewCopies option is enabled, all non-error results are actually created,
    // and it makes assertions based on that.
  ];
};

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each outcome, if failureType !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const group1 = [
    // when overwrite=true, all of the objects in this group are created successfully, so we can check the created object attributes
    {
      ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
      ...failConflict(!overwrite && spaceId === DEFAULT_SPACE_ID),
    },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...failConflict(!overwrite && spaceId === SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...failConflict(!overwrite && spaceId === SPACE_2_ID) },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...failConflict(!overwrite) },
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...failConflict(!overwrite && (spaceId === DEFAULT_SPACE_ID || spaceId === SPACE_1_ID)),
      ...destinationId(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
      ...failConflict(!overwrite && spaceId === SPACE_1_ID),
      ...destinationId(spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
      ...failConflict(!overwrite && spaceId === SPACE_2_ID),
      ...destinationId(spaceId !== SPACE_2_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
      ...failConflict(!overwrite && spaceId === DEFAULT_SPACE_ID),
      ...destinationId(spaceId !== DEFAULT_SPACE_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
      ...failConflict(!overwrite && spaceId === SPACE_1_ID),
      ...destinationId(spaceId !== SPACE_1_ID),
    },
    { ...CASES.NAMESPACE_AGNOSTIC, ...failConflict(!overwrite) },
    { ...SPECIAL_TEST_CASES.HIDDEN, ...failUnsupportedType() },
    { ...CASES.CONFLICT_1A_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_1B_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_3A_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "inexact match" conflict
    { ...CASES.CONFLICT_4_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "inexact match" conflict
    CASES.NEW_SINGLE_NAMESPACE_OBJ,
    CASES.NEW_MULTI_NAMESPACE_OBJ,
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
  ];
  const group2 = [
    // when overwrite=true, all of the objects in this group are errors, so we cannot check the created object attributes
    // grouping errors together simplifies the test suite code
    { ...CASES.CONFLICT_2C_OBJ, ...failAmbiguousConflict() }, // "ambiguous destination" conflict
  ];
  const group3 = [
    // This group needs to be executed *after* the previous test case, because those error assertions include metadata of the destinations,
    // and *these* test cases would change that metadata.
    { ...CASES.CONFLICT_2A_OBJ, ...failConflict(!overwrite) }, // "exact match" conflict with 2a
    {
      // "inexact match" conflict with 2b (since 2a already has a conflict source, this is not an ambiguous destination conflict)
      ...CASES.CONFLICT_2C_OBJ,
      ...failConflict(!overwrite),
      ...destinationId(),
      expectedNewId: 'conflict_2b',
    },
  ];
  const group4 = [
    // when overwrite=true, all of the objects in this group are created successfully, so we can check the created object attributes
    { ...CASES.CONFLICT_1_OBJ, ...failConflict(!overwrite) }, // "exact match" conflict
    CASES.CONFLICT_1A_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    CASES.CONFLICT_1B_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    { ...CASES.CONFLICT_2C_OBJ, ...newCopy() }, // "ambiguous source and destination" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_2D_OBJ, ...newCopy() }, // "ambiguous source and destination" conflict which results in a new destination ID and empty origin ID
  ];
  const refOrigins = [
    // One of these cases will always generate a missing_references error, which is an "unresolvable" error that stops any other objects
    // from being created in the import. Other test cases can have assertions based on the created objects' attributes when the overwrite
    // option is enabled, but these test cases are simply asserting pass/fail, so this group needs to be tested separately.
    { ...SPECIAL_TEST_CASES.OUTBOUND_REFERENCE_ORIGIN_MATCH_1_OBJ },
    { ...SPECIAL_TEST_CASES.OUTBOUND_REFERENCE_ORIGIN_MATCH_2_OBJ, ...failMissingReferences() },
  ];
  return { group1, group2, group3, group4, refOrigins };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = importTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (overwrite: boolean, createNewCopies: boolean, spaceId: string) => {
    const singleRequest = true;
    if (createNewCopies) {
      const cases = createNewCopiesTestCases();
      return createTestDefinitions(cases, false, { createNewCopies, spaceId, singleRequest });
    }

    const { group1, group2, group3, group4, refOrigins } = createTestCases(overwrite, spaceId);
    const tests = [
      createTestDefinitions(group1, false, { overwrite, spaceId, singleRequest }),
      createTestDefinitions(group2, false, { overwrite, spaceId, singleRequest }),
      createTestDefinitions(group3, false, { overwrite, spaceId, singleRequest }),
      createTestDefinitions(group4, false, { overwrite, spaceId, singleRequest }),
    ];
    if (!overwrite) {
      // Only include this group of test cases if the overwrite option is not enabled
      tests.push(createTestDefinitions(refOrigins, false, { overwrite, spaceId, singleRequest }));
    }
    return tests.flat();
  };

  describe('_import', () => {
    getTestScenarios([
      [false, false],
      [false, true],
      [true, false],
    ]).spaces.forEach(({ spaceId, modifier }) => {
      const [overwrite, createNewCopies] = modifier!;
      const suffix = overwrite
        ? ' with overwrite enabled'
        : createNewCopies
        ? ' with createNewCopies enabled'
        : '';
      const tests = createTests(overwrite, createNewCopies, spaceId);
      addTests(`within the ${spaceId} space${suffix}`, { spaceId, tests });
    });
  });
}
