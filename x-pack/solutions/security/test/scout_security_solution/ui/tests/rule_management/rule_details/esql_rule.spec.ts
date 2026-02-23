/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewEsqlRule } from '../../../common/rule_objects';

test.describe(
  'Rule details - ESQL rule',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('displays ESQL rule details', async ({ pageObjects, page, kbnClient }) => {
      const esqlRule = getNewEsqlRule({ name: 'ESQL Detail Test', rule_id: 'esql-detail-1' });
      const ruleResp = await createRuleFromParams(kbnClient, esqlRule);

      await pageObjects.ruleDetails.goto(ruleResp.id);
      await pageObjects.ruleDetails.waitForPageToLoad('ESQL Detail Test');

      await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText('ESQL Detail Test');

      const definitionSection = pageObjects.ruleDetails.definitionDetails;
      await expect(definitionSection).toContainText('ES|QL');
      await expect(definitionSection).toContainText(esqlRule.query);
    });
  }
);
