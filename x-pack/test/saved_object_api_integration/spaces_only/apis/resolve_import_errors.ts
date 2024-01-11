/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { SPACES } from '../../common/lib/spaces';
import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  resolveImportErrorsTestSuiteFactory,
  resolveImportErrorsTestCaseFailures,
  TEST_CASES as CASES,
  SPECIAL_TEST_CASES,
} from '../../common/suites/resolve_import_errors';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { failUnsupportedType, failConflict } = resolveImportErrorsTestCaseFailures;
const destinationId = (condition?: boolean) =>
  condition !== false ? { successParam: 'destinationId' } : {};
const newCopy = () => ({ successParam: 'createNewCopy' });

const createNewCopiesTestCases = () => {
  // for each outcome, if failureType !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  return [
    ...Object.values(CASES).map((testCase) => {
      const newId = uuidv4();
      return {
        ...testCase,
        successParam: 'createNewCopies',
        destinationId: newId,
        expectedNewId: newId,
      };
    }),
    { ...SPECIAL_TEST_CASES.HIDDEN, ...failUnsupportedType() }, // unsupported_type is an "unresolvable" error
    // Other special test cases are excluded here for simplicity and consistency with the resolveImportErrors "spaces_and_security" test
    // suite and the import test suites.
  ];
};

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each outcome, if failureType !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const singleNamespaceObject =
    spaceId === DEFAULT_SPACE_ID
      ? CASES.SINGLE_NAMESPACE_DEFAULT_SPACE
      : spaceId === SPACE_1_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_1
      : CASES.SINGLE_NAMESPACE_SPACE_2;
  return [
    { ...singleNamespaceObject, ...failConflict(!overwrite) },
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
    // all of the cases below represent imports that had an inexact match conflict or an ambiguous conflict
    // if we call _resolve_import_errors and don't specify overwrite, each of these will result in a conflict because an object with that
    // `expectedDestinationId` already exists
    { ...CASES.CONFLICT_2C_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "ambiguous destination" conflict; if overwrite=true, will overwrite 'conflict_2a'
    { ...CASES.CONFLICT_2D_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "ambiguous destination" conflict; if overwrite=true, will overwrite 'conflict_2b'
    { ...CASES.CONFLICT_3A_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_3'
    { ...CASES.CONFLICT_4_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_4a'
    {
      ...SPECIAL_TEST_CASES.OUTBOUND_MISSING_REFERENCE_CONFLICT_1_OBJ,
      ...failConflict(!overwrite),
    },
    {
      ...SPECIAL_TEST_CASES.OUTBOUND_MISSING_REFERENCE_CONFLICT_2_OBJ,
      ...failConflict(!overwrite),
      ...destinationId(),
    },
    { ...SPECIAL_TEST_CASES.OUTBOUND_REFERENCE_ORIGIN_MATCH_1_OBJ },
    { ...SPECIAL_TEST_CASES.OUTBOUND_REFERENCE_ORIGIN_MATCH_2_OBJ },
  ];
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = resolveImportErrorsTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (overwrite: boolean, createNewCopies: boolean, spaceId: string) => {
    const singleRequest = true;
    if (createNewCopies) {
      const cases = createNewCopiesTestCases();
      // The resolveImportErrors API doesn't actually have a flag for "createNewCopies" mode; rather, we create test cases as if we are resolving
      // errors from a call to the import API that had createNewCopies mode enabled.
      return createTestDefinitions(cases, false, { createNewCopies, spaceId, singleRequest });
    }

    const testCases = createTestCases(overwrite, spaceId);
    return createTestDefinitions(testCases, false, { overwrite, spaceId, singleRequest });
  };

  describe('_resolve_import_errors', () => {
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
