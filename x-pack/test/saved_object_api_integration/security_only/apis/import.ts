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
const destinationId = (condition?: boolean) =>
  condition !== false ? { successParam: 'destinationId' } : {};
const newCopy = () => ({ successParam: 'createNewCopy' });
const ambiguousConflict = (suffix: string) => ({
  failure: 409 as 409,
  fail409Param: `ambiguous_conflict_${suffix}`,
});

const createNewCopiesTestCases = () => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const cases = Object.entries(CASES).filter(([key]) => key !== 'HIDDEN');
  const importable = cases.map(([, val]) => ({ ...val, successParam: 'createNewCopies' }));
  const nonImportable = [{ ...CASES.HIDDEN, ...fail400() }];
  const all = [...importable, ...nonImportable];
  return { importable, nonImportable, all };
};

const createTestCases = (overwrite: boolean) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const group1Importable = [
    // when overwrite=true, all of the objects in this group are created successfully, so we can check the created object attributes
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
    // when overwrite=true, all of the objects in this group are created successfully, so we can check the created object attributes
    CASES.NEW_MULTI_NAMESPACE_OBJ,
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail409(!overwrite) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...destinationId() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...destinationId() },
    { ...CASES.CONFLICT_1A_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_1B_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_3A_OBJ, ...fail409(!overwrite), ...destinationId() }, // "inexact match" conflict
    { ...CASES.CONFLICT_4_OBJ, ...fail409(!overwrite), ...destinationId() }, // "inexact match" conflict
  ];
  const group3 = [
    // when overwrite=true, all of the objects in this group are errors, so we cannot check the created object attributes
    // grouping errors together simplifies the test suite code
    { ...CASES.CONFLICT_2C_OBJ, ...ambiguousConflict('2c') }, // "ambiguous destination" conflict
  ];
  const group4 = [
    // when overwrite=true, all of the objects in this group are created successfully, so we can check the created object attributes
    { ...CASES.CONFLICT_1_OBJ, ...fail409(!overwrite) }, // "exact match" conflict
    CASES.CONFLICT_1A_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    CASES.CONFLICT_1B_OBJ, // no conflict because CONFLICT_1_OBJ is an exact match
    { ...CASES.CONFLICT_2C_OBJ, ...newCopy() }, // "ambiguous source and destination" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_2D_OBJ, ...newCopy() }, // "ambiguous source and destination" conflict which results in a new destination ID and empty origin ID
  ];
  return { group1Importable, group1NonImportable, group1All, group2, group3, group4 };
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
  const createTests = (overwrite: boolean, createNewCopies: boolean) => {
    // use singleRequest to reduce execution time and/or test combined cases
    const singleRequest = true;

    if (createNewCopies) {
      const { importable, nonImportable, all } = createNewCopiesTestCases();
      return {
        unauthorized: [
          createTestDefinitions(importable, true, { createNewCopies }),
          createTestDefinitions(nonImportable, false, { createNewCopies, singleRequest }),
          createTestDefinitions(all, true, {
            createNewCopies,
            singleRequest,
            responseBodyOverride: expectForbidden('bulk_create')([
              'dashboard',
              'globaltype',
              'isolatedtype',
              'sharedtype',
            ]),
          }),
        ].flat(),
        authorized: createTestDefinitions(all, false, { createNewCopies, singleRequest }),
      };
    }

    const {
      group1Importable,
      group1NonImportable,
      group1All,
      group2,
      group3,
      group4,
    } = createTestCases(overwrite);
    return {
      unauthorized: [
        createTestDefinitions(group1Importable, true, { overwrite }),
        createTestDefinitions(group1NonImportable, false, { overwrite, singleRequest }),
        createTestDefinitions(group1All, true, {
          overwrite,
          singleRequest,
          responseBodyOverride: expectForbidden('bulk_create')([
            'dashboard',
            'globaltype',
            'isolatedtype',
          ]),
        }),
        createTestDefinitions(group2, true, { overwrite, singleRequest }),
        createTestDefinitions(group3, true, { overwrite, singleRequest }),
        createTestDefinitions(group4, true, { overwrite, singleRequest }),
      ].flat(),
      authorized: [
        createTestDefinitions(group1All, false, { overwrite, singleRequest }),
        createTestDefinitions(group2, false, { overwrite, singleRequest }),
        createTestDefinitions(group3, false, { overwrite, singleRequest }),
        createTestDefinitions(group4, false, { overwrite, singleRequest }),
      ].flat(),
    };
  };

  describe('_import', () => {
    getTestScenarios([
      [false, false],
      [false, true],
      [true, false],
    ]).security.forEach(({ users, modifier }) => {
      const [overwrite, createNewCopies] = modifier!;
      const suffix = overwrite
        ? ' with overwrite enabled'
        : createNewCopies
        ? ' with createNewCopies enabled'
        : '';
      const { unauthorized, authorized } = createTests(overwrite, createNewCopies);
      const _addTests = (user: TestUser, tests: ImportTestDefinition[]) => {
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
