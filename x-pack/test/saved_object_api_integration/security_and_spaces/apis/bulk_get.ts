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
  bulkGetTestSuiteFactory,
  TEST_CASES as CASES,
  BulkGetTestDefinition,
} from '../../common/suites/bulk_get';

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
    CASES.MULTI_NAMESPACE_ALL_SPACES,
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
    CASES.NAMESPACE_AGNOSTIC,
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail400() }];
  const allTypes = normalTypes.concat(hiddenType);
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions, expectSavedObjectForbidden } = bulkGetTestSuiteFactory(
    esArchiver,
    supertest
  );
  const createTests = (spaceId: string) => {
    const { normalTypes, hiddenType, allTypes } = createTestCases(spaceId);
    // use singleRequest to reduce execution time and/or test combined cases
    return {
      unauthorized: createTestDefinitions(allTypes, true),
      authorized: [
        createTestDefinitions(normalTypes, false, { singleRequest: true }),
        createTestDefinitions(hiddenType, true),
        createTestDefinitions(allTypes, true, {
          singleRequest: true,
          responseBodyOverride: expectSavedObjectForbidden(['hiddentype']),
        }),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false, { singleRequest: true }),
    };
  };

  describe('_bulk_get', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorized, superuser } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: BulkGetTestDefinition[]) => {
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
