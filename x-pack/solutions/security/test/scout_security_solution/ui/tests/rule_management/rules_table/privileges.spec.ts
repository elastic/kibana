/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';

test.describe.skip(
  'Rules table - privileges',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getCustomQueryRuleParams({ name: 'My rule' }));
      await browserAuth.loginAsAdmin();
    });

    test.skip('securitySolutionRulesV1.all - should be able to Enable/Disable a rule', async () => {
      // Requires createUsersAndRoles with rulesAll, rulesRead, rulesNone
    });

    test.skip('securitySolutionRulesV1.all - should see enabled bulk actions from context menu', async () => {});

    test.skip('securitySolutionRulesV1.read - should not be able to trigger Create rule process', async () => {});

    test.skip('securitySolutionRulesV1.read - should not be able to Enable/Disable a rule', async () => {});

    test.skip('securitySolutionRulesV1.read - should be able to Add a prebuilt rule', async () => {});

    test.skip('securitySolutionRulesV1 none - should not be able to see the rules management page', async () => {});
  }
);
