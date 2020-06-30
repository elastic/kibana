/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases, FindTestDefinition } from '../../common/suites/find';

const createTestCases = (spaceId: string) => {
  const cases = getTestCases(spaceId);
  const normalTypes = [
    cases.singleNamespaceType,
    cases.multiNamespaceType,
    cases.namespaceAgnosticType,
    cases.pageBeyondTotal,
    cases.unknownSearchField,
    cases.filterWithNamespaceAgnosticType,
    cases.filterWithDisallowedType,
  ];
  const hiddenAndUnknownTypes = [
    cases.hiddenType,
    cases.unknownType,
    cases.filterWithHiddenType,
    cases.filterWithUnknownType,
  ];
  const allTypes = normalTypes.concat(hiddenAndUnknownTypes);
  return { normalTypes, hiddenAndUnknownTypes, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = findTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const { normalTypes, hiddenAndUnknownTypes, allTypes } = createTestCases(spaceId);
    return {
      unauthorized: createTestDefinitions(allTypes, true),
      authorized: [
        createTestDefinitions(normalTypes, false),
        createTestDefinitions(hiddenAndUnknownTypes, true),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false),
    };
  };

  describe('_find', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorized, superuser } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: FindTestDefinition[]) => {
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
