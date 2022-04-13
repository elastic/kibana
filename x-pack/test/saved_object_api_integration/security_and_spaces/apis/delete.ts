/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteTestSuiteFactory,
  TEST_CASES as CASES,
  DeleteTestDefinition,
} from '../../common/suites/delete';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...fail400() },
    // try to delete this object again, this time using the `force` option
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, force: true },
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...fail400(spaceId === DEFAULT_SPACE_ID || spaceId === SPACE_1_ID),
      ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    // try to delete this object again, this time using the `force` option
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      force: true,
      ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
      ...fail404(spaceId !== DEFAULT_SPACE_ID),
    },
    { ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    CASES.NAMESPACE_AGNOSTIC,
    { ...CASES.ALIAS_DELETE_INCLUSIVE, force: true },
    { ...CASES.ALIAS_DELETE_EXCLUSIVE, force: true },
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail404() }];
  const allTypes = normalTypes.concat(hiddenType);
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = deleteTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const { normalTypes, hiddenType, allTypes } = createTestCases(spaceId);
    return {
      unauthorized: createTestDefinitions(allTypes, true, { spaceId }),
      authorized: [
        createTestDefinitions(normalTypes, false, { spaceId }),
        createTestDefinitions(hiddenType, true, { spaceId }),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false, { spaceId }),
    };
  };

  describe('_delete', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorized, superuser } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: DeleteTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.readAtSpace,
        users.allAtOtherSpace,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });
      [users.dualAll, users.allGlobally, users.allAtSpace].forEach((user) => {
        _addTests(user, authorized);
      });
      _addTests(users.superuser, superuser);
    });
  });
}
