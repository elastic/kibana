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
  resolveTestSuiteFactory,
  TEST_CASES as CASES,
  ResolveTestDefinition,
} from '../../common/suites/resolve';

const { fail400, fail404 } = testCaseFailures;

const createTestCases = () => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    { ...CASES.EXACT_MATCH },
    { ...CASES.ALIAS_MATCH, ...fail404() },
    { ...CASES.CONFLICT, expectedOutcome: 'exactMatch' as const },
    { ...CASES.DISABLED, ...fail404() },
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail400() }];
  const allTypes = [...normalTypes, ...hiddenType];
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = resolveTestSuiteFactory(esArchiver, supertest);
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

  describe('_resolve', () => {
    getTestScenarios().security.forEach(({ users }) => {
      const { unauthorized, authorized, superuser } = createTests();
      const _addTests = (user: TestUser, tests: ResolveTestDefinition[]) => {
        addTests(user.description, { user, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.allAtDefaultSpace,
        users.readAtDefaultSpace,
        users.allAtSpace1,
        users.readAtSpace1,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });
      [users.dualAll, users.dualRead, users.allGlobally, users.readGlobally].forEach((user) => {
        _addTests(user, authorized);
      });
      _addTests(users.superuser, superuser);
    });
  });
}
