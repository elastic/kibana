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
  ExportTestDefinition,
} from '../../common/suites/export';

const createTestCases = () => {
  const cases = getTestCases();
  const exportableObjects = [
    cases.singleNamespaceObject,
    cases.multiNamespaceObject,
    cases.multiNamespaceIsolatedObject,
    cases.namespaceAgnosticObject,
  ];
  const exportableTypes = [
    cases.singleNamespaceType,
    cases.multiNamespaceType,
    cases.multiNamespaceIsolatedType,
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
  const createTests = () => {
    const { exportableObjects, exportableTypes, nonExportableObjectsAndTypes, allObjectsAndTypes } =
      createTestCases();
    return {
      unauthorized: [
        createTestDefinitions(exportableObjects, { statusCode: 403, reason: 'unauthorized' }),
        createTestDefinitions(exportableTypes, { statusCode: 403, reason: 'unauthorized' }), // failure with empty result
        createTestDefinitions(nonExportableObjectsAndTypes, false),
      ].flat(),
      authorized: createTestDefinitions(allObjectsAndTypes, false),
    };
  };

  describe('_export', () => {
    getTestScenarios().security.forEach(({ users }) => {
      const { unauthorized, authorized } = createTests();
      const _addTests = (user: TestUser, tests: ExportTestDefinition[]) => {
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
      [
        users.dualAll,
        users.dualRead,
        users.allGlobally,
        users.readGlobally,
        users.superuser,
      ].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}
