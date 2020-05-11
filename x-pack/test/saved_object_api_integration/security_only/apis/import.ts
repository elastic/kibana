/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  importTestSuiteFactory,
  TEST_CASES as CASES,
  ImportTestDefinition,
} from '../../common/suites/import';

const { fail400, fail409 } = testCaseFailures;
const newId = (condition?: boolean) => (condition !== false ? { successParam: 'newId' } : {});
const ambiguousConflict = (suffix: string) => ({
  failure: 409 as 409,
  fail409Param: `ambiguous_conflict_${suffix}`,
});

const createTestCases = (overwrite: boolean) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const group1Importable = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail409(!overwrite) },
    CASES.SINGLE_NAMESPACE_SPACE_1,
    CASES.SINGLE_NAMESPACE_SPACE_2,
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    CASES.NEW_SINGLE_NAMESPACE_OBJ,
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
  ];
  const group1NonImportable = [{ ...CASES.HIDDEN, ...fail400() }];
  const group1All = group1Importable.concat(group1NonImportable);
  const group2 = [
    CASES.NEW_MULTI_NAMESPACE_OBJ,
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail409(!overwrite) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...newId() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...newId() },
    { ...CASES.CONFLICT_1A_OBJ, ...ambiguousConflict('1a1b') }, // "ambiguous source" conflict
    { ...CASES.CONFLICT_1B_OBJ, ...ambiguousConflict('1a1b') }, // "ambiguous source" conflict
    { ...CASES.CONFLICT_2C_OBJ, ...ambiguousConflict('2c') }, // "ambiguous destination" conflict
    { ...CASES.CONFLICT_3A_OBJ, ...fail409(!overwrite), ...newId() }, // "inexact match" conflict
    { ...CASES.CONFLICT_4_OBJ, ...fail409(!overwrite), ...newId() }, // "inexact match" conflict
  ];
  const group3 = [
    { ...CASES.CONFLICT_1_OBJ, ...fail409(!overwrite) }, // "exact match" conflict
    CASES.CONFLICT_1A_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    CASES.CONFLICT_1B_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    { ...CASES.CONFLICT_2C_OBJ, ...ambiguousConflict('2c2d') }, // "ambiguous source and destination" conflict
    { ...CASES.CONFLICT_2D_OBJ, ...ambiguousConflict('2c2d') }, // "ambiguous source and destination" conflict
  ];
  return { group1Importable, group1NonImportable, group1All, group2, group3 };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions, expectForbidden } = importTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (overwrite: boolean) => {
    const { group1Importable, group1NonImportable, group1All, group2, group3 } = createTestCases(
      overwrite
    );
    // use singleRequest to reduce execution time and/or test combined cases
    const unauthorizedCommon = [
      createTestDefinitions(group1Importable, true, overwrite, { fail403Param: 'bulk_create' }),
      createTestDefinitions(group1NonImportable, false, overwrite, { singleRequest: true }),
      createTestDefinitions(group1All, true, overwrite, {
        singleRequest: true,
        responseBodyOverride: expectForbidden('bulk_create')([
          'dashboard',
          'globaltype',
          'isolatedtype',
        ]),
      }),
    ];
    return {
      unauthorizedRead: [
        ...unauthorizedCommon,
        // multi-namespace types result in a preflight search request before a create attempt;
        // because of this, importing those types will result in a 403 "find" error (as opposed to a 403 "bulk_create" error)
        createTestDefinitions(group2, true, overwrite, {
          singleRequest: true,
          fail403Param: 'find',
        }),
        createTestDefinitions(group3, true, overwrite, {
          singleRequest: true,
          fail403Param: 'find',
        }),
      ].flat(),
      unauthorizedWrite: [
        ...unauthorizedCommon,
        createTestDefinitions(group2, true, overwrite, {
          singleRequest: true,
          fail403Param: 'bulk_create',
        }),
        createTestDefinitions(group3, true, overwrite, {
          singleRequest: true,
          fail403Param: 'bulk_create',
        }),
      ].flat(),
      authorized: [
        createTestDefinitions(group1All, false, overwrite, { singleRequest: true }),
        createTestDefinitions(group2, false, overwrite, { singleRequest: true }),
        createTestDefinitions(group3, false, overwrite, { singleRequest: true }),
      ].flat(),
    };
  };

  describe('_import', () => {
    getTestScenarios([false, true]).security.forEach(({ users, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const { unauthorizedRead, unauthorizedWrite, authorized } = createTests(overwrite!);
      const _addTests = (user: TestUser, tests: ImportTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.allAtDefaultSpace,
        users.readAtDefaultSpace,
        users.allAtSpace1,
        users.readAtSpace1,
      ].forEach((user) => {
        _addTests(user, unauthorizedRead);
      });
      [users.dualRead, users.readGlobally].forEach((user) => {
        _addTests(user, unauthorizedWrite);
      });
      [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}
