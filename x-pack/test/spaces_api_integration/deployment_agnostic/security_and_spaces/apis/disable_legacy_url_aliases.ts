/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestScenarios } from '../../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import type { TestUser } from '../../../../saved_object_api_integration/common/lib/types';
import { SPACES } from '../../../common/lib/spaces';
import type { DisableLegacyUrlAliasesTestDefinition } from '../../../common/suites/disable_legacy_url_aliases';
import {
  disableLegacyUrlAliasesTestSuiteFactory,
  TEST_CASE_SOURCE_ID,
  TEST_CASE_TARGET_TYPE,
} from '../../../common/suites/disable_legacy_url_aliases.agnostic';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = () => {
  const baseCase = { targetType: TEST_CASE_TARGET_TYPE, sourceId: TEST_CASE_SOURCE_ID };
  return {
    [DEFAULT_SPACE_ID]: { ...baseCase, targetSpace: DEFAULT_SPACE_ID, expectFound: true }, // alias exists in the default space and should have been disabled
    [SPACE_1_ID]: { ...baseCase, targetSpace: SPACE_1_ID, expectFound: false }, // alias does not exist in space_1
    [SPACE_2_ID]: { ...baseCase, targetSpace: SPACE_2_ID, expectFound: true }, // alias exists in space_2 and should have been disabled
  };
};

export default function (context: DeploymentAgnosticFtrProviderContext) {
  const { addTests, createTestDefinitions } = disableLegacyUrlAliasesTestSuiteFactory(context);

  describe('_disable_legacy_url_aliases', () => {
    const _addTests = (
      user: TestUser & { role: string },
      tests: DisableLegacyUrlAliasesTestDefinition[]
    ) => {
      addTests(`${user.description}`, { user, tests });
    };
    getTestScenarios().security.forEach(({ users }) => {
      // We are intentionally using "security" test scenarios here, *not* "securityAndSpaces", because of how these tests are structured.

      const testCases = createTestCases();

      [
        { ...users.noAccess, role: 'no_access' },
        { ...users.legacyAll, role: 'kibana_legacy_user' },
        { ...users.dualRead, role: 'dual_privileges_read' },
        { ...users.readGlobally, role: 'kibana_rbac_user' },
        { ...users.readAtDefaultSpace, role: 'kibana_rbac_default_space_read_user' },
        { ...users.readAtSpace1, role: 'kibana_rbac_space_1_all_user' },
      ].forEach((user) => {
        const unauthorized = createTestDefinitions(Object.values(testCases), true);
        _addTests(user, unauthorized);
      });

      const authorizedDefaultSpace = [
        ...createTestDefinitions(testCases[DEFAULT_SPACE_ID], false),
        ...createTestDefinitions([testCases[SPACE_1_ID], testCases[SPACE_2_ID]], true),
      ];
      _addTests(
        { ...users.allAtDefaultSpace, role: 'kibana_rbac_default_space_all_user' },
        authorizedDefaultSpace
      );

      const authorizedSpace1 = [
        ...createTestDefinitions(testCases[SPACE_1_ID], false),
        ...createTestDefinitions([testCases[DEFAULT_SPACE_ID], testCases[SPACE_2_ID]], true),
      ];
      _addTests({ ...users.allAtSpace1, role: 'kibana_rbac_space_1_all_user' }, authorizedSpace1);

      // [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
      //   const authorizedGlobally = createTestDefinitions(Object.values(testCases), false);
      //   _addTests(user, authorizedGlobally);
      // });
    });
  });
}
