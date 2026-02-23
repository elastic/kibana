/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewThresholdRule } from '../../../common/rule_objects';

test.describe(
  'Alert suppression - threshold rule',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates threshold rule with suppression and verifies details', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const rule = getNewThresholdRule();
      const created = await createRuleFromParams(kbnClient, {
        ...rule,
        rule_id: `rule-${Date.now()}`,
        alert_suppression: {
          duration: { value: 5, unit: 'h' },
        },
      });

      await pageObjects.ruleDetails.goto(created.id);

      const definitionDetails = page.testSubj.locator('definitionRule');
      await expect(definitionDetails).toBeVisible();
      await expect(definitionDetails.getByText('5h')).toBeVisible();
    });
  }
);
