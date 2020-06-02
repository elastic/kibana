/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  resolveImportErrorsTestSuiteFactory,
  TEST_CASES as CASES,
  ResolveImportErrorsTestDefinition,
} from '../../common/suites/resolve_import_errors';

const { fail400, fail409 } = testCaseFailures;
const newId = (condition?: boolean) => (condition !== false ? { successParam: 'newId' } : {});

const createTestCases = (overwrite: boolean) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const group1Importable = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail409(!overwrite) },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
  ];
  const group1NonImportable = [{ ...CASES.HIDDEN, ...fail400() }];
  const group1All = [...group1Importable, ...group1NonImportable];
  const group2 = [
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail409(!overwrite) },
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
  return { group1Importable, group1NonImportable, group1All, group2 };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions, expectForbidden } = resolveImportErrorsTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (overwrite: boolean) => {
    const { group1Importable, group1NonImportable, group1All, group2 } = createTestCases(overwrite);
    // use singleRequest to reduce execution time and/or test combined cases
    return {
      unauthorized: [
        createTestDefinitions(group1Importable, true, overwrite),
        createTestDefinitions(group1NonImportable, false, overwrite, {
          singleRequest: true,
        }),
        createTestDefinitions(group1All, true, overwrite, {
          singleRequest: true,
          responseBodyOverride: expectForbidden(['globaltype', 'isolatedtype']),
        }),
        createTestDefinitions(group2, true, overwrite, { singleRequest: true }),
      ].flat(),
      authorized: [
        createTestDefinitions(group1All, false, overwrite, { singleRequest: true }),
        createTestDefinitions(group2, false, overwrite, { singleRequest: true }),
      ].flat(),
    };
  };

  describe('_resolve_import_errors', () => {
    getTestScenarios([false, true]).security.forEach(({ users, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const { unauthorized, authorized } = createTests(overwrite!);
      const _addTests = (user: TestUser, tests: ResolveImportErrorsTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.allAtDefaultSpace,
        users.readAtDefaultSpace,
        users.allAtSpace1,
        users.readAtSpace1,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });
      [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}
