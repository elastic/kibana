/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { AUTHENTICATION } from '../../common/lib/authentication';
import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases } from '../../common/suites/find';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = (crossSpaceSearch?: string[]) => {
  const cases = getTestCases({ crossSpaceSearch });

  const normalTypes = [
    cases.singleNamespaceType,
    cases.multiNamespaceType,
    cases.multiNamespaceIsolatedType,
    cases.namespaceAgnosticType,
    cases.eachType,
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
    const defaultCases = createTestCases();
    const crossSpaceCases = createTestCases([DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID]);

    if (user.username === AUTHENTICATION.SUPERUSER.username) {
      return {
        defaultCases: createTestDefinitions(defaultCases.allTypes, false, { user }),
        crossSpace: createTestDefinitions(
          crossSpaceCases.allTypes,
          { statusCode: 400, reason: 'cross_namespace_not_permitted' },
          { user }
        ),
      };
    }

    const isAuthorizedGlobally = user.authorizedAtSpaces.includes('*');

    return {
      defaultCases: isAuthorizedGlobally
        ? [
            createTestDefinitions(defaultCases.normalTypes, false, { user }),
            createTestDefinitions(defaultCases.hiddenAndUnknownTypes, {
              statusCode: 200,
              reason: 'unauthorized',
            }),
          ].flat()
        : createTestDefinitions(defaultCases.allTypes, { statusCode: 200, reason: 'unauthorized' }),
      crossSpace: createTestDefinitions(
        crossSpaceCases.allTypes,
        { statusCode: 400, reason: 'cross_namespace_not_permitted' },
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
