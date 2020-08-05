/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory, getTestCases } from '../../common/suites/find';

const createTestCases = (currentSpace: string, crossSpaceSearch: string[]) => {
  const cases = getTestCases({ currentSpace, crossSpaceSearch });

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
  const createTests = (spaceId: string, user: TestUser) => {
    const currentSpaceCases = createTestCases(spaceId, []);

    const explicitCrossSpace = createTestCases(spaceId, ['default', 'space_1', 'space_2']);
    const wildcardCrossSpace = createTestCases(spaceId, ['*']);

    if (user.username === 'elastic') {
      return {
        currentSpace: createTestDefinitions(currentSpaceCases.allTypes, false, { user }),
        crossSpace: createTestDefinitions(explicitCrossSpace.allTypes, false, { user }),
      };
    }

    const authorizedAtCurrentSpace =
      user.authorizedAtSpaces.includes(spaceId) || user.authorizedAtSpaces.includes('*');

    const authorizedExplicitCrossSpaces = ['default', 'space_1', 'space_2'].filter(
      (s) =>
        user.authorizedAtSpaces.includes('*') ||
        (s !== spaceId && user.authorizedAtSpaces.includes(s))
    );

    const authorizedWildcardCrossSpaces = ['default', 'space_1', 'space_2'].filter(
      (s) => user.authorizedAtSpaces.includes('*') || user.authorizedAtSpaces.includes(s)
    );

    const explicitCrossSpaceDefinitions =
      authorizedExplicitCrossSpaces.length > 0
        ? [
            createTestDefinitions(explicitCrossSpace.normalTypes, false, { user }),
            createTestDefinitions(
              explicitCrossSpace.hiddenAndUnknownTypes,
              {
                statusCode: 403,
                reason: 'forbidden_types',
              },
              { user }
            ),
          ].flat()
        : createTestDefinitions(
            explicitCrossSpace.allTypes,
            {
              statusCode: 403,
              reason: 'forbidden_namespaces',
            },
            { user }
          );

    const wildcardCrossSpaceDefinitions =
      authorizedWildcardCrossSpaces.length > 0
        ? [
            createTestDefinitions(wildcardCrossSpace.normalTypes, false, { user }),
            createTestDefinitions(
              wildcardCrossSpace.hiddenAndUnknownTypes,
              {
                statusCode: 403,
                reason: 'forbidden_types',
              },
              { user }
            ),
          ].flat()
        : createTestDefinitions(
            wildcardCrossSpace.allTypes,
            {
              statusCode: 403,
              reason: 'forbidden_namespaces',
            },
            { user }
          );

    return {
      currentSpace: authorizedAtCurrentSpace
        ? [
            createTestDefinitions(currentSpaceCases.normalTypes, false, {
              user,
            }),
            createTestDefinitions(currentSpaceCases.hiddenAndUnknownTypes, {
              statusCode: 403,
              reason: 'forbidden_types',
            }),
          ].flat()
        : createTestDefinitions(currentSpaceCases.allTypes, {
            statusCode: 403,
            reason: 'forbidden_types',
          }),
      crossSpace: [...explicitCrossSpaceDefinitions, ...wildcardCrossSpaceDefinitions],
    };
  };

  describe('_find', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;

      Object.values(users).forEach((user) => {
        const { currentSpace, crossSpace } = createTests(spaceId, user);
        addTests(`${user.description}${suffix}`, {
          user,
          spaceId,
          tests: [...currentSpace, ...crossSpace],
        });
      });
    });
  });
}
