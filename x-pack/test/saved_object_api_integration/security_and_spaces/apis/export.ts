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
  const createTests = (spaceId: string) => {
    const { exportableTypes, nonExportableTypes, allTypes } = createTestCases(spaceId);
    return {
      unauthorized: [
        createTestDefinitions(exportableTypes, true),
        createTestDefinitions(nonExportableTypes, false),
      ].flat(),
      authorized: createTestDefinitions(allTypes, false),
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
