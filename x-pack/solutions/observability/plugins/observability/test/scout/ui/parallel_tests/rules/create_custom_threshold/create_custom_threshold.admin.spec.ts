/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../../fixtures';
import { DATA_VIEWS } from '../../../fixtures/generators';

const RULE_NAME = 'test custom threshold rule';
const RULE_TAG = 'tag1';

test.describe('Create Custom Threshold Rule', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesPage.goto();
  });

  test.afterEach(async ({ apiServices }) => {
    // Clean up created rules after each test
    const rulesResponse = await apiServices.alerting.rules.find({
      search: RULE_NAME,
      search_fields: ['name'],
    });
    const rules = rulesResponse?.data?.data || [];
    for (const rule of rules) {
      if (rule.name === RULE_NAME) {
        await apiServices.alerting.rules.delete(rule.id);
      }
    }
  });

  test('should create a custom threshold rule with all configurations', async ({
    pageObjects,
    apiServices,
  }) => {
    // Open the create rule modal and select custom threshold rule
    await pageObjects.rulesPage.openRuleTypeModal();
    await pageObjects.customThresholdRulePage.clickObservabilityCategory();
    await pageObjects.customThresholdRulePage.clickCustomThresholdRule();

    // Set rule name and tags
    await pageObjects.customThresholdRulePage.setRuleName(RULE_NAME);
    await pageObjects.customThresholdRulePage.addTag(RULE_TAG);

    // Select data view
    await pageObjects.customThresholdRulePage.selectDataView(DATA_VIEWS.METRICBEAT.NAME);

    // Set first aggregation (A) - AVERAGE of metricset.rtt
    await pageObjects.customThresholdRulePage.setAggregationA('avg', 'metricset.rtt');

    // Add second aggregation (B) - COUNT with filter
    await pageObjects.customThresholdRulePage.addAggregationB('service.name : "opbeans-node"');

    // Set custom equation
    await pageObjects.customThresholdRulePage.setCustomEquation('A - B');

    // Set threshold - NOT BETWEEN 200 AND 250
    await pageObjects.customThresholdRulePage.setThreshold('notBetween', '200', '250');

    // Set equation label
    await pageObjects.customThresholdRulePage.setEquationLabel('test equation');

    // Set time range - 2 days
    await pageObjects.customThresholdRulePage.setTimeRange('2', 'd');

    // Set group by
    await pageObjects.customThresholdRulePage.setGroupBy('docker.container.name');

    // Save the rule
    await pageObjects.customThresholdRulePage.saveRule();

    // Verify success toast
    await pageObjects.customThresholdRulePage.expectSuccessToast(RULE_NAME);

    // Verify the rule was created correctly via API
    const rulesResponse = await apiServices.alerting.rules.find({
      search: RULE_NAME,
      search_fields: ['name'],
    });

    expect(rulesResponse.status).toBe(200);
    // Filter for exact name match since search can return partial matches
    const matchingRules = rulesResponse.data.data.filter(
      (rule: { name: string }) => rule.name === RULE_NAME
    );
    expect(matchingRules).toHaveLength(1);

    const createdRule = matchingRules[0];
    expect(createdRule.name).toBe(RULE_NAME);
    expect(createdRule.tags).toContain(RULE_TAG);
    expect(createdRule.consumer).toBe('alerts');

    // Verify rule params
    const params = createdRule.params;
    expect(params.alertOnGroupDisappear).toBe(false);
    expect(params.alertOnNoData).toBe(false);
    expect(params.groupBy).toContain('docker.container.name');

    // Verify criteria
    expect(params.criteria).toHaveLength(1);
    const criteria = params.criteria[0];
    expect(criteria.comparator).toBe('notBetween');
    expect(criteria.label).toBe('test equation');
    expect(criteria.equation).toBe('A - B');
    expect(criteria.threshold).toStrictEqual([200, 250]);
    expect(criteria.timeSize).toBe(2);
    expect(criteria.timeUnit).toBe('d');

    // Verify metrics
    expect(criteria.metrics).toHaveLength(2);
    expect(criteria.metrics[0]).toStrictEqual({
      aggType: 'avg',
      field: 'metricset.rtt',
      name: 'A',
    });
    expect(criteria.metrics[1]).toStrictEqual({
      aggType: 'count',
      filter: 'service.name : "opbeans-node"',
      name: 'B',
    });

    // Verify search configuration
    expect(params.searchConfiguration.index).toBe(DATA_VIEWS.METRICBEAT.ID);
    expect(params.searchConfiguration.query).toStrictEqual({ query: '', language: 'kuery' });
  });

  test('should show aggregation type options', async ({ pageObjects }) => {
    // Open the create rule modal and select custom threshold rule
    await pageObjects.rulesPage.openRuleTypeModal();
    await pageObjects.customThresholdRulePage.clickObservabilityCategory();
    await pageObjects.customThresholdRulePage.clickCustomThresholdRule();

    // Click on aggregation A to open the popover
    await pageObjects.customThresholdRulePage.aggregationNameA.click();
    await pageObjects.customThresholdRulePage.aggregationTypeSelect.click();

    // Verify all aggregation options are available
    const aggregationSelect = pageObjects.customThresholdRulePage.aggregationTypeSelect;
    await expect(aggregationSelect.locator('option[value="avg"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="min"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="max"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="sum"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="count"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="cardinality"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="p99"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="p95"]')).toBeAttached();
    await expect(aggregationSelect.locator('option[value="rate"]')).toBeAttached();
  });

  test('should show comparator options', async ({ pageObjects }) => {
    // Open the create rule modal and select custom threshold rule
    await pageObjects.rulesPage.openRuleTypeModal();
    await pageObjects.customThresholdRulePage.clickObservabilityCategory();
    await pageObjects.customThresholdRulePage.clickCustomThresholdRule();

    // Click on threshold popover
    await pageObjects.customThresholdRulePage.thresholdPopoverButton.click();
    await pageObjects.customThresholdRulePage.comparatorSelect.click();

    // Verify all comparator options are available
    const comparatorSelect = pageObjects.customThresholdRulePage.comparatorSelect;
    await expect(comparatorSelect.locator('option[value=">="]')).toBeAttached();
    await expect(comparatorSelect.locator('option[value="<="]')).toBeAttached();
    await expect(comparatorSelect.locator('option[value=">"]')).toBeAttached();
    await expect(comparatorSelect.locator('option[value="<"]')).toBeAttached();
    await expect(comparatorSelect.locator('option[value="between"]')).toBeAttached();
    await expect(comparatorSelect.locator('option[value="notBetween"]')).toBeAttached();
  });

  test('should show time window unit options', async ({ pageObjects }) => {
    // Open the create rule modal and select custom threshold rule
    await pageObjects.rulesPage.openRuleTypeModal();
    await pageObjects.customThresholdRulePage.clickObservabilityCategory();
    await pageObjects.customThresholdRulePage.clickCustomThresholdRule();

    // Click on for last expression
    await pageObjects.customThresholdRulePage.forLastExpressionButton.click();
    await pageObjects.customThresholdRulePage.timeWindowUnitSelect.click();

    // Verify all time unit options are available
    const timeUnitSelect = pageObjects.customThresholdRulePage.timeWindowUnitSelect;
    await expect(timeUnitSelect.locator('option[value="s"]')).toBeAttached();
    await expect(timeUnitSelect.locator('option[value="m"]')).toBeAttached();
    await expect(timeUnitSelect.locator('option[value="h"]')).toBeAttached();
    await expect(timeUnitSelect.locator('option[value="d"]')).toBeAttached();
  });
});
