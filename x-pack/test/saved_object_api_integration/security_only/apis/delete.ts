/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteTestSuiteFactory,
  TEST_CASES as CASES,
  DeleteTestDefinition,
} from '../../common/suites/delete';

const { fail400, fail404 } = testCaseFailures;

const createTestCases = () => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail404() },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail404() },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...fail400() },
    // try to delete this object again, this time using the `force` option
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, force: true },
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail400() },
    // try to delete this object again, this time using the `force` option
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, force: true },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail404() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail404() },
    { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE },
    { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1, ...fail404() },
    CASES.NAMESPACE_AGNOSTIC,
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail404() }];
  const allTypes = normalTypes.concat(hiddenType);
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = deleteTestSuiteFactory(esArchiver, supertest);
  const createTests = () => {
    const { normalTypes, hiddenType, allTypes } = createTestCases();
    return {
      unauthorized: createTestDefinitions(allTypes, true),
      authorized: [
        createTestDefinitions(normalTypes, false),
        createTestDefinitions(hiddenType, true),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false),
    };
  };

  describe('_delete', () => {
    getTestScenarios().security.forEach(({ users }) => {
      const { unauthorized, authorized, superuser } = createTests();
      const _addTests = (user: TestUser, tests: DeleteTestDefinition[]) => {
        addTests(user.description, { user, tests });
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
