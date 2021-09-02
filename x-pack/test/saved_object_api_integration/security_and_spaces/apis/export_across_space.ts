/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  exportTestSuiteFactory,
  getTestCases,
  AcrossSpaceExportTestDefinition,
} from '../../common/suites/export_across_space';

const createTestCases = (spaceId: string) => {
  const cases = getTestCases(spaceId);

  const exportableObjectsInCurrentSpace = [
    cases.singleNamespaceObjectFromCurrentSpace,
    cases.multiNamespaceObjectFromCurrentSpace,
    cases.multiNamespaceIsolatedObjectFromCurrentSpace,
    cases.namespaceAgnosticObjectFromCurrentSpace,
  ];

  const exportableTypesInCurrentSpace = [
    cases.singleNamespaceTypeFromCurrentSpace,
    cases.multiNamespaceTypeFromCurrentSpace,
    cases.multiNamespaceIsolatedTypeFromCurrentSpace,
    cases.namespaceAgnosticTypeFromCurrentSpace,
  ];

  const exportableObjectsInOtherSpace = [
    cases.singleNamespaceObjectFromOtherSpace,
    cases.multiNamespaceObjectFromOtherSpace,
    cases.multiNamespaceIsolatedObjectFromOtherSpace,
  ];

  const exportableTypesInOtherSpace = [
    cases.singleNamespaceTypeFromOtherSpace,
    cases.multiNamespaceTypeFromOtherSpace,
    cases.namespaceAgnosticTypeFromOtherSpace,
    cases.hiddenTypeFromOtherSpace,
    cases.multiNamespaceIsolatedTypeFromOtherSpace,
  ];

  const exportableObjectsInMixedSpaces = [
    cases.singleNamespaceObjectFromMixedSpaces,
    cases.multiNamespaceObjectFromMixedSpaces,
  ];

  const exportableTypesInMixedSpaces = [
    cases.singleNamespaceTypeFromMixedSpaces,
    cases.multiNamespaceTypeFromMixedSpaces,
  ];

  const nonExportableObjectsAndTypes = [
    cases.hiddenObjectFromCurrentSpace,
    cases.hiddenTypeFromCurrentSpace,
  ];

  return {
    exportableObjectsInCurrentSpace,
    exportableTypesInCurrentSpace,
    exportableObjectsInOtherSpace,
    exportableTypesInOtherSpace,
    exportableObjectsInMixedSpaces,
    exportableTypesInMixedSpaces,
    nonExportableObjectsAndTypes,
  };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = exportTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const {
      exportableObjectsInCurrentSpace,
      exportableTypesInCurrentSpace,
      exportableObjectsInOtherSpace,
      exportableTypesInOtherSpace,
      exportableObjectsInMixedSpaces,
      exportableTypesInMixedSpaces,
      nonExportableObjectsAndTypes,
    } = createTestCases(spaceId);

    const authorized = false as const;
    const forbidden = {
      statusCode: 403 as const,
      reason: 'forbidden' as const,
    };

    return {
      unauthorized: [
        ...createTestDefinitions(exportableObjectsInCurrentSpace, forbidden),
        ...createTestDefinitions(exportableTypesInCurrentSpace, forbidden),
        ...createTestDefinitions(exportableObjectsInOtherSpace, forbidden),
        ...createTestDefinitions(exportableTypesInOtherSpace, forbidden),
        ...createTestDefinitions(exportableObjectsInMixedSpaces, forbidden),
        ...createTestDefinitions(exportableTypesInMixedSpaces, forbidden),
        ...createTestDefinitions(nonExportableObjectsAndTypes, forbidden),
      ],
      authorized: [
        ...createTestDefinitions(exportableObjectsInCurrentSpace, authorized),
        ...createTestDefinitions(exportableTypesInCurrentSpace, authorized),
        ...createTestDefinitions(exportableObjectsInOtherSpace, authorized),
        ...createTestDefinitions(exportableTypesInOtherSpace, authorized),
        ...createTestDefinitions(exportableObjectsInMixedSpaces, authorized),
        ...createTestDefinitions(exportableTypesInMixedSpaces, authorized),
        ...createTestDefinitions(nonExportableObjectsAndTypes, false),
      ],
    };
  };

  describe('_export_across_space', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { authorized, unauthorized } = createTests(spaceId);

      const _addTests = (user: TestUser, tests: AcrossSpaceExportTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.allAtSpace,
        users.readAtSpace,
        users.allAtOtherSpace,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });

      [
        users.allGlobally,
        users.readGlobally,
        users.superuser,
        users.dualAll,
        users.dualRead,
      ].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}
