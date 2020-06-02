/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  resolveImportErrorsTestSuiteFactory,
  TEST_CASES as CASES,
} from '../../common/suites/resolve_import_errors';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;
const newId = (condition?: boolean) => (condition !== false ? { successParam: 'newId' } : {});

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const singleNamespaceObject =
    spaceId === DEFAULT_SPACE_ID
      ? CASES.SINGLE_NAMESPACE_DEFAULT_SPACE
      : spaceId === SPACE_1_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_1
      : CASES.SINGLE_NAMESPACE_SPACE_2;
  return [
    { ...singleNamespaceObject, ...fail409(!overwrite) },
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...fail409(!overwrite && (spaceId === DEFAULT_SPACE_ID || spaceId === SPACE_1_ID)),
      ...newId(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
      ...fail409(!overwrite && spaceId === SPACE_1_ID),
      ...newId(spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
      ...fail409(!overwrite && spaceId === SPACE_2_ID),
      ...newId(spaceId !== SPACE_2_ID),
    },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    { ...CASES.HIDDEN, ...fail400() },
    // all of the cases below represent imports that had an inexact match conflict or an ambiguous conflict
    // if we call _resolve_import_errors and don't specify overwrite or duplicate, each of these will not result in a conflict because they
    // will skip the preflight search results; so the objects will be created instead.
    { ...CASES.CONFLICT_1A_OBJ, ...newId(overwrite) }, // "ambiguous source" conflict; if overwrite=true, will overwrite 'conflict_1'
    CASES.CONFLICT_1B_OBJ, // "ambiguous source" conflict; if overwrite=true, will create a new object (since 'conflict_1a' is overwriting 'conflict_1')
    { ...CASES.CONFLICT_2C_OBJ, ...newId(overwrite) }, // "ambiguous source and destination" conflict; if overwrite=true, will overwrite 'conflict_2a'
    { ...CASES.CONFLICT_2D_OBJ, ...newId(overwrite) }, // "ambiguous source and destination" conflict; if overwrite=true, will overwrite 'conflict_2b'
    { ...CASES.CONFLICT_3A_OBJ, ...newId(overwrite) }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_3'
    { ...CASES.CONFLICT_4_OBJ, ...newId(overwrite) }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_4a'
  ];
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions } = resolveImportErrorsTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (overwrite: boolean, spaceId: string) => {
    const testCases = createTestCases(overwrite, spaceId);
    return createTestDefinitions(testCases, false, overwrite, {
      spaceId,
      singleRequest: true,
    });
  };

  describe('_resolve_import_errors', () => {
    getTestScenarios([false, true]).spaces.forEach(({ spaceId, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const tests = createTests(overwrite!, spaceId);
      addTests(`within the ${spaceId} space${suffix}`, { spaceId, tests });
    });
  });
}
