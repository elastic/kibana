/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams } from '../../../../common/rule_api_helpers';
import { getNewRule } from '../../../../common/rule_objects';

test.describe('Endpoint exceptions from alerts table', {
  tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
}, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
  });

  test.skip('Endpoint exceptions from alerts table', async () => {
    // Needs: endpoint alerts, add endpoint exception
  });
});
