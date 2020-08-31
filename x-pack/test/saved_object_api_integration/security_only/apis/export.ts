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

const createTestCases = () => {
  const cases = getTestCases();
  const exportableTypes = [
    cases.singleNamespaceObject,
    cases.singleNamespaceType,
    cases.multiNamespaceObject,
    cases.multiNamespaceType,
    cases.namespaceAgnosticObject,
    cases.namespaceAgnosticType,
  ];
  const nonExportableTypes = [cases.hiddenObject, cases.hiddenType];
  const allTypes = exportableTypes.concat(nonExportableTypes);
  return { exportableTypes, nonExportableTypes, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = exportTestSuiteFactory(esArchiver, supertest);
  const createTests = () => {
    const { exportableTypes, nonExportableTypes, allTypes } = createTestCases();
    return {
      unauthorized: [
        createTestDefinitions(exportableTypes, true),
        createTestDefinitions(nonExportableTypes, false),
      ].flat(),
      authorized: createTestDefinitions(allTypes, false),
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
