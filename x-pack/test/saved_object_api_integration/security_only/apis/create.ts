/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createTestSuiteFactory,
  TEST_CASES as CASES,
  CreateTestDefinition,
} from '../../common/suites/create';

const { fail400, fail409 } = testCaseFailures;

const createTestCases = (overwrite: boolean) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail409(!overwrite) },
    CASES.SINGLE_NAMESPACE_SPACE_1,
    CASES.SINGLE_NAMESPACE_SPACE_2,
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail409(!overwrite) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail409() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail409() },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    CASES.NEW_SINGLE_NAMESPACE_OBJ,
    CASES.NEW_MULTI_NAMESPACE_OBJ,
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail400() }];
  const allTypes = normalTypes.concat(hiddenType);
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions } = createTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (overwrite: boolean) => {
    const { normalTypes, hiddenType, allTypes } = createTestCases(overwrite);
    return {
      unauthorized: createTestDefinitions(allTypes, true, overwrite),
      authorized: [
        createTestDefinitions(normalTypes, false, overwrite),
        createTestDefinitions(hiddenType, true, overwrite),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false, overwrite),
    };
  };

  describe('_create', () => {
    getTestScenarios([false, true]).security.forEach(({ users, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const { unauthorized, authorized, superuser } = createTests(overwrite!);
      const _addTests = (user: TestUser, tests: CreateTestDefinition[]) => {
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
      [users.dualAll, users.allGlobally].forEach((user) => {
        _addTests(user, authorized);
      });
      _addTests(users.superuser, superuser);
    });
  });
}
