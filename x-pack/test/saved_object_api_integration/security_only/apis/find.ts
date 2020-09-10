/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases } from '../../common/suites/find';

const createTestCases = (crossSpaceSearch: string[]) => {
  const cases = getTestCases({ crossSpaceSearch });

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
  const createTests = (user: TestUser) => {
    const defaultCases = createTestCases([]);
    const crossSpaceCases = createTestCases(['default', 'space_1', 'space_2']);

    if (user.username === 'elastic') {
      return {
        defaultCases: createTestDefinitions(defaultCases.allTypes, false, { user }),
        crossSpace: createTestDefinitions(
          crossSpaceCases.allTypes,
          {
            statusCode: 400,
            reason: 'cross_namespace_not_permitted',
          },
          { user }
        ),
      };
    }

    const authorizedGlobally = user.authorizedAtSpaces.includes('*');

    return {
      defaultCases: authorizedGlobally
        ? [
            createTestDefinitions(defaultCases.normalTypes, false, {
              user,
            }),
            createTestDefinitions(defaultCases.hiddenAndUnknownTypes, {
              statusCode: 403,
              reason: 'forbidden_types',
            }),
          ].flat()
        : createTestDefinitions(defaultCases.allTypes, {
            statusCode: 403,
            reason: 'forbidden_types',
          }),
      crossSpace: createTestDefinitions(
        crossSpaceCases.allTypes,
        {
          statusCode: 400,
          reason: 'cross_namespace_not_permitted',
        },
        { user }
      ),
    };
  };

  describe('_find', () => {
    getTestScenarios().security.forEach(({ users }) => {
      Object.values(users).forEach((user) => {
        const { defaultCases, crossSpace } = createTests(user);
        addTests(`${user.description}`, { user, tests: [...defaultCases, ...crossSpace] });
      });
    });
  });
}
