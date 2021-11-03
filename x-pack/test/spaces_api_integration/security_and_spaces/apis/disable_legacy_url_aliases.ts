/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import { getTestScenarios } from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import { TestUser } from '../../../saved_object_api_integration/common/lib/types';
import {
  disableLegacyUrlAliasesTestSuiteFactory,
  DisableLegacyUrlAliasesTestCase,
  TEST_CASE_TARGET_TYPE,
  TEST_CASE_SOURCE_ID,
  DisableLegacyUrlAliasesTestDefinition,
} from '../../common/suites/disable_legacy_url_aliases';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const {
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = (...spaceIds: string[]): DisableLegacyUrlAliasesTestCase[] => {
  return spaceIds.map((targetSpace) => ({
    targetSpace,
    targetType: TEST_CASE_TARGET_TYPE,
    sourceId: TEST_CASE_SOURCE_ID,
  }));
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = disableLegacyUrlAliasesTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );

  describe('_disable_legacy_url_aliases', () => {
    const _addTests = (user: TestUser, tests: DisableLegacyUrlAliasesTestDefinition[]) => {
      addTests(`${user.description}`, { user, tests });
    };
    getTestScenarios().security.forEach(({ users }) => {
      // We are intentionally using "security" test scenarios here, *not* "securityAndSpaces", because of how these tests are structured.

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.allAtDefaultSpace,
        users.readAtDefaultSpace,
        users.readAtSpace1,
      ].forEach((user) => {
        const unauthorized = createTestDefinitions(createTestCases(SPACE_1_ID, SPACE_2_ID), true);
        _addTests(user, unauthorized);
      });

      const authorizedSpace1 = [
        ...createTestDefinitions(createTestCases(SPACE_1_ID), false),
        ...createTestDefinitions(createTestCases(SPACE_2_ID), true),
      ];
      _addTests(users.allAtSpace1, authorizedSpace1);

      [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
        const authorizedGlobally = createTestDefinitions(
          createTestCases(SPACE_1_ID, SPACE_2_ID),
          false
        );
        _addTests(user, authorizedGlobally);
      });
    });
  });
}
