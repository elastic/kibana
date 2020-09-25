/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  exportTestSuiteFactory,
  getTestCases,
  ExportTestDefinition,
} from '../../common/suites/export';

const createTestCases = (spaceId: string) => {
  const cases = getTestCases(spaceId);
  const exportableObjects = [
    cases.singleNamespaceObject,
    cases.multiNamespaceObject,
    cases.namespaceAgnosticObject,
  ];
  const exportableTypes = [
    cases.singleNamespaceType,
    cases.multiNamespaceType,
    cases.namespaceAgnosticType,
  ];
  const nonExportableObjectsAndTypes = [cases.hiddenObject, cases.hiddenType];
  const allObjectsAndTypes = [
    exportableObjects,
    exportableTypes,
    nonExportableObjectsAndTypes,
  ].flat();
  return { exportableObjects, exportableTypes, nonExportableObjectsAndTypes, allObjectsAndTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = exportTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const {
      exportableObjects,
      exportableTypes,
      nonExportableObjectsAndTypes,
      allObjectsAndTypes,
    } = createTestCases(spaceId);
    return {
      unauthorized: [
        createTestDefinitions(exportableObjects, { statusCode: 403, reason: 'unauthorized' }),
        createTestDefinitions(exportableTypes, { statusCode: 200, reason: 'unauthorized' }), // failure with empty result
        createTestDefinitions(nonExportableObjectsAndTypes, false),
      ].flat(),
      authorized: createTestDefinitions(allObjectsAndTypes, false),
    };
  };

  describe('_export', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorized } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: ExportTestDefinition[]) => {
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
        users.superuser,
      ].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}
