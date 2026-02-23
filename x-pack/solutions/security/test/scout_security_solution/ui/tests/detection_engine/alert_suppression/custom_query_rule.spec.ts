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

test.describe(
  'Alert suppression - custom query rule',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const SUPPRESS_BY_FIELDS = ['source.ip'];

    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Creates rule with per-execution suppression via API and verifies details', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const rule = getCustomQueryRuleParams();
      const created = await createRuleFromParams(kbnClient, {
        ...rule,
        rule_id: `rule-${Date.now()}`,
        alert_suppression: {
          group_by: SUPPRESS_BY_FIELDS,
          missing_fields_strategy: 'suppress',
        },
      });

      await pageObjects.ruleDetails.goto(created.id);

      const definitionDetails = page.testSubj.locator('definitionRule');
      await expect(definitionDetails).toBeVisible();
      await expect(definitionDetails.getByText(SUPPRESS_BY_FIELDS.join(''))).toBeVisible();
      await expect(definitionDetails.getByText('One rule execution')).toBeVisible();
      await expect(
        definitionDetails.getByText('Suppress and group alerts for events with missing fields')
      ).toBeVisible();
    });

    test('Creates rule with time interval suppression via API and verifies details', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const rule = getCustomQueryRuleParams();
      const created = await createRuleFromParams(kbnClient, {
        ...rule,
        rule_id: `rule-${Date.now()}`,
        alert_suppression: {
          group_by: SUPPRESS_BY_FIELDS,
          duration: { value: 45, unit: 'm' },
          missing_fields_strategy: 'doNotSuppress',
        },
      });

      await pageObjects.ruleDetails.goto(created.id);

      const definitionDetails = page.testSubj.locator('definitionRule');
      await expect(definitionDetails).toBeVisible();
      await expect(definitionDetails.getByText(SUPPRESS_BY_FIELDS.join(''))).toBeVisible();
      await expect(definitionDetails.getByText('45m')).toBeVisible();
      await expect(
        definitionDetails.getByText('Do not suppress alerts for events with missing fields')
      ).toBeVisible();
    });
  }
);
