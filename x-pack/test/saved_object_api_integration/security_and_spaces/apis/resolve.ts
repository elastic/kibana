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
  resolveTestSuiteFactory,
  TEST_CASES as CASES,
  ResolveTestDefinition,
} from '../../common/suites/resolve';

const {
  SPACE_1: { spaceId: SPACE_1_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    CASES.EXACT_MATCH,
    { ...CASES.ALIAS_MATCH, ...fail404(spaceId !== SPACE_1_ID) },
    {
      ...CASES.CONFLICT,
      ...(spaceId !== SPACE_1_ID && { expectedOutcome: 'exactMatch' as 'exactMatch' }),
    },
    { ...CASES.DISABLED, ...fail404() },
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail404() }];
  const allTypes = normalTypes.concat(hiddenType);
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = resolveTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const { normalTypes, hiddenType, allTypes } = createTestCases(spaceId);
    // use singleRequest to reduce execution time and/or test combined cases
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
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorized, superuser } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: ResolveTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [users.noAccess, users.legacyAll, users.allAtOtherSpace].forEach((user) => {
        _addTests(user, unauthorized);
      });
      [
        users.dualAll,
        users.dualRead,
        users.allGlobally,
        users.readGlobally,
        users.allAtSpace,
        users.readAtSpace,
      ].forEach((user) => {
        _addTests(user, authorized);
      });
      _addTests(users.superuser, superuser);
    });
  });
}
