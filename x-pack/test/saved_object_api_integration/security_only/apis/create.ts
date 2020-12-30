/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createTestSuiteFactory,
  TEST_CASES as CASES,
  CreateTestDefinition,
} from '../../common/suites/create';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;

const createTestCases = (overwrite: boolean) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const expectedNamespaces = [DEFAULT_SPACE_ID]; // newly created objects should have this `namespaces` array in their return value
  const normalTypes = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail409(!overwrite) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, expectedNamespaces },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, expectedNamespaces },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...fail409(!overwrite) },
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail409(!overwrite) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail409() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail409() },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    { ...CASES.NEW_SINGLE_NAMESPACE_OBJ, expectedNamespaces },
    { ...CASES.NEW_MULTI_NAMESPACE_OBJ, expectedNamespaces },
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
    CASES.NEW_EACH_SPACE_OBJ,
    CASES.NEW_ALL_SPACES_OBJ,
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
  const createTests = (overwrite: boolean, user: TestUser) => {
    const { normalTypes, hiddenType, allTypes } = createTestCases(overwrite);
    return {
      unauthorized: createTestDefinitions(allTypes, true, overwrite, { user }),
      authorized: [
        createTestDefinitions(normalTypes, false, overwrite, { user }),
        createTestDefinitions(hiddenType, true, overwrite, { user }),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false, overwrite, { user }),
    };
  };

  describe('_create', () => {
    getTestScenarios([false, true]).security.forEach(({ users, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
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
        const { unauthorized } = createTests(overwrite!, user);
        _addTests(user, unauthorized);
      });
      [users.dualAll, users.allGlobally].forEach((user) => {
        const { authorized } = createTests(overwrite!, user);
        _addTests(user, authorized);
      });
      const { superuser } = createTests(overwrite!, users.superuser);
      _addTests(users.superuser, superuser);
    });
  });
}
