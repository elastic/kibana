/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';
import { deleteRuleByName } from '../../../fixtures/helpers';
import {
  CUSTOM_THRESHOLD_DATA_VIEW,
  cleanupCustomThresholdMetrics,
  generateCustomThresholdMetrics,
} from '../../../fixtures/custom_threshold_data';

/**
 * Ported from the FTR `pages/alerts/custom_threshold.ts` suite (11 sequential
 * `it` blocks driving the custom-threshold creation wizard end to end).
 *
 * The original split the journey across many `it`s that shared one browser
 * session; here it is a single test with a `test.step` per wizard stage so a
 * failure points at the offending stage without leaking shared state across
 * Playwright tests.
 *
 * The deep "saved the rule correctly" payload assertion moved to the API spec
 * (`api/tests/custom_threshold_rule_data_view.spec.ts`); this UI test owns
 * driving the form and verifying the rule is created.
 */
test.describe(
  'Custom Threshold Rule - full creation form',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Distinct prefix avoids search collisions with the global-setup rules.
    const RULE_NAME = `@@@ - Scout - Custom threshold full form - ${Date.now()}`;

    test.beforeAll(async ({ esClient, apiServices }) => {
      // The aggregation-field and group-by comboboxes populate from the selected
      // data view's real field caps, so index a backing `metricbeat-*` doc set
      // and register a saved data view over it.
      await generateCustomThresholdMetrics(esClient);
      await apiServices.dataViews.create({
        id: CUSTOM_THRESHOLD_DATA_VIEW.id,
        name: CUSTOM_THRESHOLD_DATA_VIEW.name,
        title: CUSTOM_THRESHOLD_DATA_VIEW.title,
        timeFieldName: CUSTOM_THRESHOLD_DATA_VIEW.timeFieldName,
        override: true,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesPage.goto();
    });

    test.afterAll(async ({ esClient, apiServices, log }) => {
      await deleteRuleByName(apiServices, RULE_NAME);
      await apiServices.dataViews
        .delete(CUSTOM_THRESHOLD_DATA_VIEW.id)
        .catch((err) => log.warning(`Failed to delete data view: ${err.message}`));
      await cleanupCustomThresholdMetrics(esClient);
    });

    test('creates a custom threshold rule via the full wizard', async ({ pageObjects }) => {
      const { rulesPage, ruleDetailsPage } = pageObjects;

      await test.step('open the custom threshold rule form', async () => {
        await rulesPage.openRuleTypeModal();
        await rulesPage.clickCustomThresholdRuleType();
      });

      await test.step('set name and tags', async () => {
        await rulesPage.setRuleName(RULE_NAME);
        await rulesPage.addRuleTag('tag1');
      });

      await test.step('select the saved data view', async () => {
        await rulesPage.selectSavedDataView(CUSTOM_THRESHOLD_DATA_VIEW.name);
      });

      await test.step('configure the avg and count aggregations', async () => {
        await rulesPage.setAverageAggregation('metricset.rtt');
        await rulesPage.addCountAggregationWithFilter('service.name : "opbeans-node"');
      });

      await test.step('set the custom equation', async () => {
        await rulesPage.setCustomEquation('A - B');
      });

      await test.step('set the threshold', async () => {
        await rulesPage.setThreshold('notBetween', [200, 250]);
      });

      await test.step('set the equation label', async () => {
        await rulesPage.setEquationLabel('test equation');
      });

      await test.step('set the time window', async () => {
        await rulesPage.setTimeWindow(2, 'd');
      });

      await test.step('set the group by', async () => {
        await rulesPage.setGroupBy('docker.container.name');
      });

      await test.step('save the rule', async () => {
        await rulesPage.waitForFormReady();
        await rulesPage.saveRule();
        await ruleDetailsPage.expectRuleDetailsPageLoaded();
        await expect(ruleDetailsPage.ruleName).toHaveText(RULE_NAME);
        await expect(ruleDetailsPage.ruleType).toContainText('Custom threshold');
      });
    });
  }
);
