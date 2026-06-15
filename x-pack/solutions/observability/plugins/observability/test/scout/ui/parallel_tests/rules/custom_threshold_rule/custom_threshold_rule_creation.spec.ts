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

test.describe(
  'Custom Threshold Rule - Full creation flow',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const AD_HOC_DATA_VIEW_PATTERN = '.alerts-*';
    let testRuleName: string;

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      testRuleName = `@@@ - Scout - Custom threshold full creation - ${Date.now()}`;
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesPage.goto();
      await pageObjects.rulesPage.openRuleTypeModal();
      await pageObjects.rulesPage.clickCustomThresholdRuleType();
    });

    test.afterEach(async ({ apiServices }) => {
      await deleteRuleByName(apiServices, testRuleName);
    });

    test('should create a custom threshold rule with all fields and verify saved params', async ({
      pageObjects,
      apiServices,
    }) => {
      await test.step('set rule name', async () => {
        await pageObjects.rulesPage.setRuleName(testRuleName);
      });

      await test.step('add tags', async () => {
        await pageObjects.rulesPage.setTags(['tag1']);
      });

      await test.step('select ad-hoc data view', async () => {
        await pageObjects.rulesPage.setIndexPatternAndWaitForButton(AD_HOC_DATA_VIEW_PATTERN);
        await pageObjects.rulesPage.clickExploreMatchingIndices();
      });

      await test.step('configure aggregation A as count', async () => {
        await pageObjects.rulesPage.openMetricRowPopover();
        await pageObjects.rulesPage.selectCountAggregation();
        await pageObjects.rulesPage.closeCurrentPopover();
      });

      await test.step('add aggregation B with KQL filter', async () => {
        await pageObjects.rulesPage.addSecondAggregation();
        await pageObjects.rulesPage.openAggregationBPopover();
        await pageObjects.rulesPage.selectCountAggregation();
        await pageObjects.rulesPage.typeInKqlFilter('kibana.alert.status: "active"');
        await pageObjects.rulesPage.closeCurrentPopover();
      });

      await test.step('set custom equation A - B', async () => {
        await pageObjects.rulesPage.setCustomEquation('A - B');
      });

      // Threshold, time range, and group-by are all set before the label.
      // The expression_row debounces label changes by 300ms, capturing a snapshot of
      // `expression` at fill-time. Setting label last ensures every other field is already
      // committed in parent state when that debounce fires.
      await test.step('set threshold to notBetween 200 and 250', async () => {
        await pageObjects.rulesPage.setThreshold('notBetween', [200, 250]);
      });

      await test.step('set time range to 2 days', async () => {
        await pageObjects.rulesPage.setTimeRange('2', 'd');
      });

      await test.step('set group by', async () => {
        await pageObjects.rulesPage.setGroupBy('kibana.alert.rule.name');
      });

      await test.step('set equation label', async () => {
        await pageObjects.rulesPage.setEquationLabel('test equation');
      });

      await test.step('save the rule and verify rule details page', async () => {
        await pageObjects.rulesPage.saveRule();
        await pageObjects.ruleDetailsPage.expectRuleDetailsPageLoaded();
        await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(testRuleName);
        await expect(pageObjects.ruleDetailsPage.ruleType).toContainText('Custom threshold');
      });

      await test.step('verify saved rule params via API', async () => {
        const rulesResponse = await apiServices.alerting.rules.find({ search: testRuleName });
        const rule = rulesResponse?.data?.data?.find(
          (r: { name: string }) => r.name === testRuleName
        );
        expect(rule).toBeDefined();
        expect(rule.tags).toEqual(['tag1']);
        expect(rule.params.criteria[0]).toMatchObject({
          comparator: 'notBetween',
          label: 'test equation',
          equation: 'A - B',
          threshold: [200, 250],
          timeSize: 2,
          timeUnit: 'd',
        });
        expect(rule.params.criteria[0].metrics).toHaveLength(2);
        expect(rule.params.criteria[0].metrics[0]).toMatchObject({ aggType: 'count', name: 'A' });
        expect(rule.params.criteria[0].metrics[1]).toMatchObject({
          aggType: 'count',
          filter: 'kibana.alert.status: "active"',
          name: 'B',
        });
      });
    });
  }
);
