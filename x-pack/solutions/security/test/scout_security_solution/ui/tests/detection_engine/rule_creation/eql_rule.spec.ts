/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';

test.describe('EQL rule - Rule Creation', {
  tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
}, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
  });

  test.skip('Creates and enables an EQL rule', async () => {
    // Needs: EQL rule type, fillDefineEqlRuleAndContinue, etc.
  });

  test.skip('Creates and enables an EQL rule with a sequence', async () => {
    // Needs: EQL sequence rule creation flow
  });
});
