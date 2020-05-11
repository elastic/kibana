/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { importTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/import';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;
const newId = (condition?: boolean) => (condition !== false ? { successParam: 'newId' } : {});
const ambiguousConflict = (suffix: string) => ({
  failure: 409 as 409,
  fail409Param: `ambiguous_conflict_${suffix}`,
});

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const group1 = [
    {
      ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
      ...fail409(!overwrite && spaceId === DEFAULT_SPACE_ID),
    },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail409(!overwrite && spaceId === SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail409(!overwrite && spaceId === SPACE_2_ID) },
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
    { ...CASES.CONFLICT_1A_OBJ, ...ambiguousConflict('1a1b') }, // "ambiguous source" conflict
    { ...CASES.CONFLICT_1B_OBJ, ...ambiguousConflict('1a1b') }, // "ambiguous source" conflict
    { ...CASES.CONFLICT_2C_OBJ, ...ambiguousConflict('2c') }, // "ambiguous destination" conflict
    { ...CASES.CONFLICT_3A_OBJ, ...fail409(!overwrite), ...newId() }, // "inexact match" conflict
    { ...CASES.CONFLICT_4_OBJ, ...fail409(!overwrite), ...newId() }, // "inexact match" conflict
    CASES.NEW_SINGLE_NAMESPACE_OBJ,
    CASES.NEW_MULTI_NAMESPACE_OBJ,
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
  ];
  const group2 = [
    { ...CASES.CONFLICT_1_OBJ, ...fail409(!overwrite) }, // "exact match" conflict
    CASES.CONFLICT_1A_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    CASES.CONFLICT_1B_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    { ...CASES.CONFLICT_2C_OBJ, ...ambiguousConflict('2c2d') }, // "ambiguous source and destination" conflict
    { ...CASES.CONFLICT_2D_OBJ, ...ambiguousConflict('2c2d') }, // "ambiguous source and destination" conflict
  ];
  return { group1, group2 };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions } = importTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (overwrite: boolean, spaceId: string) => {
    const { group1, group2 } = createTestCases(overwrite, spaceId);
    return [
      createTestDefinitions(group1, false, overwrite, { spaceId, singleRequest: true }),
      createTestDefinitions(group2, false, overwrite, { spaceId, singleRequest: true }),
    ].flat();
  };

  describe('_import', () => {
    getTestScenarios([false, true]).spaces.forEach(({ spaceId, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const tests = createTests(overwrite!, spaceId);
      addTests(`within the ${spaceId} space${suffix}`, { spaceId, tests });
    });
  });
}
