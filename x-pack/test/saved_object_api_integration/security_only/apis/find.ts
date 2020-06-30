/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases, FindTestDefinition } from '../../common/suites/find';

const createTestCases = () => {
  const cases = getTestCases();
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
  const createTests = () => {
    const { normalTypes, hiddenAndUnknownTypes, allTypes } = createTestCases();
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
    getTestScenarios().security.forEach(({ users }) => {
      const { unauthorized, authorized, superuser } = createTests();
      const _addTests = (user: TestUser, tests: FindTestDefinition[]) => {
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
