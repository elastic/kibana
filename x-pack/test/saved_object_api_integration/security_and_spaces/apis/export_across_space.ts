/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { SPACES } from '../../common/lib/spaces';
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

  const nonExportableObjectsAndTypes = [
    cases.hiddenObjectFromCurrentSpace,
    cases.hiddenTypeFromCurrentSpace,
  ];

  return {
    exportableObjectsInCurrentSpace,
    exportableTypesInCurrentSpace,
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
      nonExportableObjectsAndTypes,
    } = createTestCases(spaceId);

    const authorized = false as const;
    const unauthorized = {
      statusCode: 403 as const,
      reason: 'unauthorized' as const,
    };
    const badRequest = {
      statusCode: 400 as const,
      reason: 'bad_request' as const,
    };

    const currentSpace = spaceId;
    const otherSpace =
      spaceId === SPACES.DEFAULT.spaceId ? SPACES.SPACE_1.spaceId : SPACES.DEFAULT.spaceId;

    return {
      globallyUnauthorized: [
        ...createTestDefinitions(exportableObjectsInCurrentSpace, unauthorized),
        ...createTestDefinitions(exportableTypesInCurrentSpace, badRequest),
        ...createTestDefinitions(nonExportableObjectsAndTypes, false),
      ],
      globallyAuthorized: [
        ...createTestDefinitions(exportableObjectsInCurrentSpace, authorized),
        ...createTestDefinitions(exportableTypesInCurrentSpace, authorized),
        ...createTestDefinitions(nonExportableObjectsAndTypes, false),
      ],
      authorizedInCurrentSpace: [
        ...createTestDefinitions(exportableObjectsInCurrentSpace, authorized, {
          authorizedAtSpace: [currentSpace],
        }),
        ...createTestDefinitions(exportableTypesInCurrentSpace, authorized, {
          authorizedAtSpace: [currentSpace],
        }),
        ...createTestDefinitions(nonExportableObjectsAndTypes, false),
      ],
      authorizedInOtherSpace: [
        ...createTestDefinitions(exportableObjectsInCurrentSpace, unauthorized, {
          authorizedAtSpace: [otherSpace],
        }),
        ...createTestDefinitions(exportableTypesInCurrentSpace, badRequest, {
          authorizedAtSpace: [otherSpace],
        }),
        ...createTestDefinitions(nonExportableObjectsAndTypes, false),
      ],
    };
  };

  // TODO: remove grep prefix
  describe('TOTO _export across spaces', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const {
        globallyAuthorized,
        globallyUnauthorized,
        authorizedInCurrentSpace,
        authorizedInOtherSpace,
      } = createTests(spaceId);

      const _addTests = (user: TestUser, tests: AcrossSpaceExportTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [users.noAccess /*, users.legacyAll*/].forEach((user) => {
        _addTests(user, globallyUnauthorized);
      });

      [users.allAtSpace /*, users.readAtSpace*/].forEach((user) => {
        _addTests(user, authorizedInCurrentSpace);
      });

      [users.allAtOtherSpace].forEach((user) => {
        _addTests(user, authorizedInOtherSpace);
      });

      [
        // users.dualAll,
        // users.dualRead,
        // users.allGlobally,
        // users.readGlobally,
        users.superuser,
      ].forEach((user) => {
        _addTests(user, globallyAuthorized);
      });
    });
  });
}
