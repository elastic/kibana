/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { v4 as uuidv4 } from 'uuid';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  resolveImportErrorsTestSuiteFactory,
  TEST_CASES as CASES,
  ResolveImportErrorsTestDefinition,
} from '../../common/suites/resolve_import_errors';

const { fail400, fail409 } = testCaseFailures;
const destinationId = (condition?: boolean) =>
  condition !== false ? { successParam: 'destinationId' } : {};
const newCopy = () => ({ successParam: 'createNewCopy' });

const createNewCopiesTestCases = () => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const cases = Object.entries(CASES).filter(([key]) => key !== 'HIDDEN');
  const importable = cases.map(([, val]) => ({
    ...val,
    successParam: 'createNewCopies',
    expectedNewId: uuidv4(),
  }));
  const nonImportable = [{ ...CASES.HIDDEN, ...fail400() }];
  const all = [...importable, ...nonImportable];
  return { importable, nonImportable, all };
};

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
    { ...CASES.CONFLICT_1A_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_1B_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    // all of the cases below represent imports that had an inexact match conflict or an ambiguous conflict
    // if we call _resolve_import_errors and don't specify overwrite, each of these will result in a conflict because an object with that
    // `expectedDestinationId` already exists
    { ...CASES.CONFLICT_2C_OBJ, ...fail409(!overwrite), ...destinationId() }, // "ambiguous destination" conflict; if overwrite=true, will overwrite 'conflict_2a'
    { ...CASES.CONFLICT_3A_OBJ, ...fail409(!overwrite), ...destinationId() }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_3'
    { ...CASES.CONFLICT_4_OBJ, ...fail409(!overwrite), ...destinationId() }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_4a'
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
            responseBodyOverride: expectForbidden(['globaltype', 'isolatedtype', 'sharedtype']),
          }),
        ].flat(),
        authorized: createTestDefinitions(all, false, { createNewCopies, singleRequest }),
      };
    }

    const { group1Importable, group1NonImportable, group1All, group2 } = createTestCases(overwrite);
    return {
      unauthorized: [
        createTestDefinitions(group1Importable, true, { overwrite }),
        createTestDefinitions(group1NonImportable, false, { overwrite, singleRequest }),
        createTestDefinitions(group1All, true, {
          overwrite,
          singleRequest,
          responseBodyOverride: expectForbidden(['globaltype', 'isolatedtype']),
        }),
        createTestDefinitions(group2, true, { overwrite, singleRequest }),
      ].flat(),
      authorized: [
        createTestDefinitions(group1All, false, { overwrite, singleRequest }),
        createTestDefinitions(group2, false, { overwrite, singleRequest }),
      ].flat(),
    };
  };

  describe('_resolve_import_errors', () => {
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
