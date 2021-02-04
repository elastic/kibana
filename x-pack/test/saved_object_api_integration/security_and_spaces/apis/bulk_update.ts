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
  bulkUpdateTestSuiteFactory,
  TEST_CASES as CASES,
  BulkUpdateTestDefinition,
} from '../../common/suites/bulk_update';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

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
  const hiddenType = [{ ...CASES.HIDDEN, ...fail404() }];
  const allTypes = normalTypes.concat(hiddenType);
  // an "object namespace" string can be specified for individual objects (to bulkUpdate across namespaces)
  const withObjectNamespaces = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, namespace: DEFAULT_SPACE_ID },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, namespace: SPACE_1_ID },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, namespace: SPACE_1_ID, ...fail404() }, // intentional 404 test case
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, namespace: DEFAULT_SPACE_ID }, // any spaceId will work (not '*')
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, namespace: DEFAULT_SPACE_ID }, // SPACE_1_ID would also work
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, namespace: SPACE_2_ID, ...fail404() }, // intentional 404 test case
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, namespace: SPACE_2_ID },
    CASES.NAMESPACE_AGNOSTIC, // any namespace would work and would make no difference
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  return { normalTypes, hiddenType, allTypes, withObjectNamespaces };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    addTests,
    createTestDefinitions,
    expectSavedObjectForbidden,
  } = bulkUpdateTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const { normalTypes, hiddenType, allTypes, withObjectNamespaces } = createTestCases(spaceId);
    // use singleRequest to reduce execution time and/or test combined cases
    const authorizedCommon = [
      createTestDefinitions(normalTypes, false, { singleRequest: true }),
      createTestDefinitions(hiddenType, true),
      createTestDefinitions(allTypes, true, {
        singleRequest: true,
        responseBodyOverride: expectSavedObjectForbidden(['hiddentype']),
      }),
    ].flat();
    return {
      unauthorized: [
        createTestDefinitions(allTypes, true),
        createTestDefinitions(withObjectNamespaces, true, { singleRequest: true }),
      ].flat(),
      authorizedAtSpace: [
        authorizedCommon,
        createTestDefinitions(withObjectNamespaces, true, { singleRequest: true }),
      ].flat(),
      authorizedAllSpaces: [
        authorizedCommon,
        createTestDefinitions(withObjectNamespaces, false, { singleRequest: true }),
      ].flat(),
      superuser: [
        createTestDefinitions(allTypes, false, { singleRequest: true }),
        createTestDefinitions(withObjectNamespaces, false, { singleRequest: true }),
      ].flat(),
    };
  };

  describe('_bulk_update', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorizedAtSpace, authorizedAllSpaces, superuser } = createTests(
        spaceId
      );
      const _addTests = (user: TestUser, tests: BulkUpdateTestDefinition[]) => {
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
      [users.allAtSpace].forEach((user) => {
        _addTests(user, authorizedAtSpace);
      });
      [users.dualAll, users.allGlobally].forEach((user) => {
        _addTests(user, authorizedAllSpaces);
      });
      _addTests(users.superuser, superuser);
    });
  });
}
