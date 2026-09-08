/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { tags, test } from '../fixtures';

test.describe(
  'Rule author cannot add Elastic Defend response actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsSecurityRole('rule_author');
    });

    test('Elastic Defend keypad stays disabled on create', async ({ pageObjects }) => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await pageObjects.ruleResponseActionsForm.fillNewCustomQueryRule({
        name: `Scout ARA create ${suffix}`,
        description: `Scout ARA create ${suffix}`,
      });

      await expect(pageObjects.ruleResponseActionsForm.elasticDefendOption).toBeDisabled();

      await pageObjects.ruleResponseActionsForm.forceClickElasticDefendOption();

      await expect(pageObjects.ruleResponseActionsForm.responseActionItem(0)).toHaveCount(0);
    });
  }
);
