/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createAnomalyRule as createRule,
  disableRule,
  enableRule,
  runRule,
  createIndexConnector,
  snoozeRule,
  createLatencyThresholdRule,
  createEsQueryRule,
} from '../../../../api_integration/test_suites/common/alerting/helpers/alerting_api_helper';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlTriggersActionsUI = getPageObject('svlTriggersActionsUI');
  const header = getPageObject('header');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const toasts = getService('toasts');

  async function refreshRulesList() {
    const existsClearFilter = await testSubjects.exists('rules-list-clear-filter');
    if (existsClearFilter) {
      await testSubjects.click('rules-list-clear-filter');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
    }
    await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
    await testSubjects.click('manageRulesPageButton');
  }

  async function failRule({
    ruleId,
    intervalMilliseconds,
    numAttempts,
  }: {
    ruleId: string;
    intervalMilliseconds: number;
    numAttempts: number;
  }) {
    for (let i = 0; i < numAttempts; i++) {
      await runRule({ supertest, ruleId });
      await new Promise((resolve) => setTimeout(resolve, intervalMilliseconds));

      await disableRule({ supertest, ruleId });
      await new Promise((resolve) => setTimeout(resolve, intervalMilliseconds));

      await refreshRulesList();
      const result = await svlTriggersActionsUI.getRulesListWithStatus();
      const rulesStatuses = result.map((item: { status: string }) => item.status);
      if (rulesStatuses.includes('Failed')) return;

      await enableRule({ supertest, ruleId });
    }
  }

  describe('Rules list', () => {
    let ruleIdList: string[];

    const assertRulesLength = async (length: number) => {
      return await retry.try(async () => {
        const rules = await svlTriggersActionsUI.getRulesList();
        expect(rules.length).toEqual(length);
      });
    };

    before(async () => {
      await svlCommonPage.login();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
      await testSubjects.click('manageRulesPageButton');
    });

    afterEach(async () => {
      await Promise.all(
        ruleIdList.map(async (ruleId) => {
          await supertest
            .delete(`/api/alerting/rule/${ruleId}`)
            .set('kbn-xsrf', 'foo')
            .set('x-elastic-internal-origin', 'foo');
        })
      );
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    it('should create an ES Query Rule and display it when consumer is observability', async () => {
      const esQuery = await createEsQueryRule({
        supertest,
        name: 'ES Query',
        consumer: 'observability',
        ruleTypeId: '.es-query',
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
      });
      ruleIdList = [esQuery.id];

      await refreshRulesList();
      const searchResults = await svlTriggersActionsUI.getRulesList();
      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual('ES QueryElasticsearch query');
    });

    it('should create an ES Query rule but not display it when consumer is stackAlerts', async () => {
      const esQuery = await createEsQueryRule({
        supertest,
        name: 'ES Query',
        consumer: 'stackAlerts',
        ruleTypeId: '.es-query',
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
      });
      ruleIdList = [esQuery.id];

      await refreshRulesList();
      await testSubjects.missingOrFail('rule-row');
    });

    it('should create and display an APM latency rule', async () => {
      const apmLatency = await createLatencyThresholdRule({ supertest, name: 'Apm latency' });
      ruleIdList = [apmLatency.id];

      await refreshRulesList();
      const searchResults = await svlTriggersActionsUI.getRulesList();
      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual('Apm latencyLatency threshold');
    });

    it('should display rules in alphabetical order', async () => {
      const rule1 = await createRule({
        supertest,
        name: 'b',
      });
      const rule2 = await createRule({
        supertest,
        name: 'c',
      });
      const rule3 = await createRule({
        supertest,
        name: 'a',
      });

      ruleIdList = [rule1.id, rule2.id, rule3.id];

      await refreshRulesList();
      const searchResults = await svlTriggersActionsUI.getRulesList();

      expect(searchResults.length).toEqual(3);
      expect(searchResults[0].name).toEqual(`aAPM Anomaly`);
      expect(searchResults[1].name).toEqual(`bAPM Anomaly`);
      expect(searchResults[2].name).toEqual(`cAPM Anomaly`);
    });

    it('should search for rule', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      const searchResults = await svlTriggersActionsUI.getRulesList();
      await svlTriggersActionsUI.searchRules(rule1.name);

      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual(`${rule1.name}APM Anomaly`);
      expect(searchResults[0].interval).toEqual('1 min');
      expect(searchResults[0].tags).toEqual('2');
      expect(searchResults[0].duration).toMatch(/\d{2,}:\d{2}/);
    });

    it('should update rule list on the search clear button click', async () => {
      const rule1 = await createRule({
        supertest,
        name: 'a',
      });

      const rule2 = await createRule({
        supertest,
        name: 'b',
        tags: [],
      });

      ruleIdList = [rule1.id, rule2.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await svlTriggersActionsUI.searchRules(`${rule1.name}`);
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );
      await retry.try(async () => {
        const searchResults = await svlTriggersActionsUI.getRulesList();
        expect(searchResults.length).toEqual(1);
        expect(searchResults[0].name).toEqual(`${rule1.name}APM Anomaly`);
        expect(searchResults[0].interval).toEqual('1 min');
        expect(searchResults[0].tags).toEqual('2');
        expect(searchResults[0].duration).toMatch(/\d{2,}:\d{2}/);
      });

      const searchClearButton = await find.byCssSelector('.euiFormControlLayoutClearButton');
      await searchClearButton.click();
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );

      await retry.try(async () => {
        const searchResultsAfterClear = await svlTriggersActionsUI.getRulesList();
        expect(searchResultsAfterClear.length).toEqual(2);
        expect(searchResultsAfterClear[0].name).toEqual(`${rule1.name}APM Anomaly`);
        expect(searchResultsAfterClear[0].interval).toEqual('1 min');
        expect(searchResultsAfterClear[0].tags).toEqual('2');
        expect(searchResultsAfterClear[0].duration).toMatch(/\d{2,}:\d{2}/);
        expect(searchResultsAfterClear[1].name).toEqual(`${rule2.name}APM Anomaly`);
        expect(searchResultsAfterClear[1].interval).toEqual('1 min');
        expect(searchResultsAfterClear[1].tags).toEqual('');
        expect(searchResultsAfterClear[1].duration).toMatch(/\d{2,}:\d{2}/);
      });
    });

    it('should search for tags', async () => {
      const rule1 = await createRule({
        supertest,
        name: 'a',
        tags: ['tag', 'tagtag', 'taggity tag'],
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await svlTriggersActionsUI.searchRules(`${rule1.name} tag`);
      const searchResults = await svlTriggersActionsUI.getRulesList();

      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual(`${rule1.name}APM Anomaly`);
      expect(searchResults[0].interval).toEqual('1 min');
      expect(searchResults[0].tags).toEqual('3');
      expect(searchResults[0].duration).toMatch(/\d{2,}:\d{2}/);
    });

    it('should display an empty list when search did not return any rules', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(`An Alert That For Sure Doesn't Exist!`);
      expect(await svlTriggersActionsUI.isRulesListDisplayed()).toEqual(true);
    });

    it('should disable single rule', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();

      await svlTriggersActionsUI.searchRules(rule1.name);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('disableButton');

      await testSubjects.click('confirmModalConfirmButton');

      await header.waitUntilLoadingHasFinished();

      await refreshRulesList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        rule1.name,
        'statusDropdown',
        'disabled'
      );
    });

    it('should re-enable single rule', async () => {
      const rule1 = await createRule({
        supertest,
        name: 'a',
      });

      ruleIdList = [rule1.id];

      await disableRule({ supertest, ruleId: rule1.id });
      await refreshRulesList();

      await svlTriggersActionsUI.searchRules(rule1.name);

      await testSubjects.click('collapsedItemActions');

      await retry.waitForWithTimeout('disable button to show up', 30000, async () => {
        return await testSubjects.isDisplayed('disableButton');
      });

      await testSubjects.click('disableButton');

      await refreshRulesList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        rule1.name,
        'statusDropdown',
        'enabled'
      );
    });

    it('should delete single rule', async () => {
      const rule1 = await createRule({
        supertest,
        name: 'a',
      });

      const rule2 = await createRule({
        supertest,
        name: 'b',
      });

      ruleIdList = [rule1.id, rule2.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(rule2.name);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('deleteRule');
      await testSubjects.exists('rulesDeleteIdsConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();
        expect(toastText).toEqual('Deleted 1 rule');
      });

      await svlTriggersActionsUI.searchRules(rule2.name);
      const searchResultsAfterDelete = await svlTriggersActionsUI.getRulesList();
      expect(searchResultsAfterDelete.length).toEqual(0);
    });

    it('should disable all selection', async () => {
      const createdRule1 = await createRule({
        supertest,
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(createdRule1.name);

      await testSubjects.click(`checkboxSelectRow-${createdRule1.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkDisable');

      await testSubjects.click('confirmModalConfirmButton');
      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();
        expect(toastText).toEqual('Disabled 1 rule');
      });

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        createdRule1.name,
        'statusDropdown',
        'disabled'
      );
    });

    it('should enable all selection', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await disableRule({ supertest, ruleId: rule1.id });

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(rule1.name);

      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkEnable');

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        rule1.name,
        'statusDropdown',
        'enabled'
      );
    });

    it('should render percentile column and cells correctly', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await testSubjects.existOrFail('rulesTable-P50ColumnName');
      await testSubjects.existOrFail('P50Percentile');

      await retry.try(async () => {
        const percentileCell = await find.byCssSelector(
          '[data-test-subj="P50Percentile"]:nth-of-type(1)'
        );
        const percentileCellText = await percentileCell.getVisibleText();
        expect(percentileCellText).toMatch(/^N\/A|\d{2,}:\d{2}$/);

        await testSubjects.click('percentileSelectablePopover-iconButton');
        await testSubjects.existOrFail('percentileSelectablePopover-selectable');
        const searchClearButton = await find.byCssSelector(
          '[data-test-subj="percentileSelectablePopover-selectable"] li:nth-child(2)'
        );
        const ruleResults = await svlTriggersActionsUI.getRulesList();
        expect(ruleResults[0].duration).toMatch(/^N\/A|\d{2,}:\d{2}$/);

        await searchClearButton.click();
        await testSubjects.missingOrFail('percentileSelectablePopover-selectable');
        await testSubjects.existOrFail('rulesTable-P95ColumnName');
        await testSubjects.existOrFail('P95Percentile');
      });
    });

    it('should delete all selection', async () => {
      const createdRule1 = await createRule({
        supertest,
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(createdRule1.name);

      await testSubjects.click(`checkboxSelectRow-${createdRule1.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkDelete');
      await testSubjects.exists('rulesDeleteIdsConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();
        expect(toastText).toEqual('Deleted 1 rule');
      });

      await svlTriggersActionsUI.searchRules(createdRule1.name);
      const searchResultsAfterDelete = await svlTriggersActionsUI.getRulesList();
      expect(searchResultsAfterDelete).toHaveLength(0);
    });

    it.skip('should filter rules by the status', async () => {
      const rule1 = await createRule({
        supertest,
      });

      const failedRule = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id, failedRule.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await failRule({
        ruleId: failedRule.id,
        intervalMilliseconds: 1000,
        numAttempts: 100,
      });

      // initialy alert get Pending status, so we need to retry refresh list logic to get the post execution statuses
      await retry.try(async () => {
        await refreshRulesList();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
        const refreshResults = await svlTriggersActionsUI.getRulesListWithStatus();
        expect(refreshResults.map((item: any) => item.status).sort()).toEqual([
          'Failed',
          'Succeeded',
        ]);
      });

      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await testSubjects.click('ruleLastRunOutcomeFilterButton');
      await testSubjects.click('ruleLastRunOutcomefailedFilterOption'); // select Error status filter

      await retry.try(async () => {
        const filterErrorOnlyResults = await svlTriggersActionsUI.getRulesListWithStatus();
        expect(filterErrorOnlyResults.length).toEqual(1);
        expect(filterErrorOnlyResults[0].name).toEqual(`${failedRule.name}APM Anomaly`);
        expect(filterErrorOnlyResults[0].interval).toEqual('1 min');
        expect(filterErrorOnlyResults[0].status).toEqual('Failed');
        expect(filterErrorOnlyResults[0].duration).toMatch(/\d{2,}:\d{2}/);
      });

      // Clear it again because it is still selected
      await refreshRulesList();
      await assertRulesLength(2);
    });

    it.skip('should display total rules by status and error banner only when exists rules with status error', async () => {
      const rule1 = await createRule({
        supertest,
      });

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await retry.try(async () => {
        await refreshRulesList();
        const refreshResults = await svlTriggersActionsUI.getRulesListWithStatus();

        expect(refreshResults.length).toEqual(1);
        expect(refreshResults[0].name).toEqual(`${rule1.name}APM Anomaly`);
        expect(refreshResults[0].interval).toEqual('1 min');
        expect(refreshResults[0].status).toEqual('Succeeded');
        expect(refreshResults[0].duration).toMatch(/\d{2,}:\d{2}/);
      });

      const alertsErrorBannerWhenNoErrors = await find.allByCssSelector(
        '[data-test-subj="rulesErrorBanner"]'
      );
      expect(alertsErrorBannerWhenNoErrors).toHaveLength(0);

      const failedRule = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id, failedRule.id];

      await failRule({
        ruleId: failedRule.id,
        intervalMilliseconds: 1000,
        numAttempts: 100,
      });

      await retry.try(async () => {
        await refreshRulesList();
        const alertsErrorBannerExistErrors = await find.allByCssSelector(
          '[data-test-subj="rulesErrorBanner"]'
        );
        expect(alertsErrorBannerExistErrors).toHaveLength(1);
        expect(
          await (await alertsErrorBannerExistErrors[0].findByTagName('p')).getVisibleText()
        ).toEqual(' Error found in 1 rule. Show rule with error');
      });

      await retry.try(async () => {
        await refreshRulesList();
        expect(await testSubjects.getVisibleText('totalRulesCount')).toEqual('2 rules');
        expect(await testSubjects.getVisibleText('totalSucceededRulesCount')).toEqual(
          'Succeeded: 1'
        );
        expect(await testSubjects.getVisibleText('totalFailedRulesCount')).toEqual('Failed: 1');
        expect(await testSubjects.getVisibleText('totalWarningRulesCount')).toEqual('Warning: 0');
      });
    });

    it.skip('Expand error in rules table when there is rule with an error associated', async () => {
      const rule1 = await createRule({
        supertest,
        name: 'a',
      });

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await retry.try(async () => {
        await refreshRulesList();
        const refreshResults = await svlTriggersActionsUI.getRulesListWithStatus();
        expect(refreshResults.length).toEqual(1);
        expect(refreshResults[0].name).toEqual(`${rule1.name}APM Anomaly`);
        expect(refreshResults[0].interval).toEqual('1 min');
        expect(refreshResults[0].status).toEqual('Succeeded');
        expect(refreshResults[0].duration).toMatch(/\d{2,}:\d{2}/);
      });

      let expandRulesErrorLink = await find.allByCssSelector('[data-test-subj="expandRulesError"]');
      expect(expandRulesErrorLink).toHaveLength(0);

      const failedRule = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id, failedRule.id];

      await failRule({
        ruleId: failedRule.id,
        intervalMilliseconds: 1000,
        numAttempts: 100,
      });

      await retry.try(async () => {
        await refreshRulesList();
        expandRulesErrorLink = await find.allByCssSelector('[data-test-subj="expandRulesError"]');
        expect(expandRulesErrorLink).toHaveLength(1);
      });
      await refreshRulesList();
      await testSubjects.click('expandRulesError');
      const expandedRow = await find.allByCssSelector('.euiTableRow-isExpandedRow');
      expect(expandedRow).toHaveLength(1);
      expect(await (await expandedRow[0].findByTagName('div')).getVisibleText()).toEqual(
        'Error from last run\nRule failed to execute because rule ran after it was disabled.'
      );
    });

    it('should filter rules by the rule type', async () => {
      const rule1 = await createRule({
        supertest,
      });

      const rule2 = await createLatencyThresholdRule({
        supertest,
      });

      ruleIdList = [rule1.id, rule2.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await testSubjects.click('ruleTypeFilterButton');

      await retry.try(async () => {
        const isOpen = await testSubjects.exists('ruleType0Group');
        if (!isOpen) {
          await testSubjects.click('ruleTypeFilterButton');
        }

        expect(await (await testSubjects.find('ruleType0Group')).getVisibleText()).toEqual(
          'Observability'
        );
      });

      await testSubjects.click('ruleTypeapm.anomalyFilterOption');

      await retry.try(async () => {
        const filterInventoryRuleOnlyResults = await svlTriggersActionsUI.getRulesList();
        expect(filterInventoryRuleOnlyResults.length).toEqual(1);
        expect(filterInventoryRuleOnlyResults[0].name).toEqual(`${rule1.name}APM Anomaly`);
        expect(filterInventoryRuleOnlyResults[0].interval).toEqual('1 min');
        expect(filterInventoryRuleOnlyResults[0].duration).toMatch(/\d{2,}:\d{2}/);
      });

      // Clear it again because it is still selected
      await testSubjects.click('rules-list-clear-filter');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);
    });

    it('should filter rules by the rule status', async () => {
      // Enabled alert
      const rule1 = await createRule({
        supertest,
      });

      const disabledRule = await createRule({
        supertest,
      });
      await disableRule({
        supertest,
        ruleId: disabledRule.id,
      });

      const snoozedRule = await createRule({
        supertest,
      });

      await snoozeRule({
        supertest,
        ruleId: snoozedRule.id,
      });

      const snoozedAndDisabledRule = await createRule({
        supertest,
      });
      await snoozeRule({
        supertest,
        ruleId: snoozedAndDisabledRule.id,
      });
      await disableRule({
        supertest,
        ruleId: snoozedAndDisabledRule.id,
      });

      ruleIdList = [rule1.id, disabledRule.id, snoozedRule.id, snoozedAndDisabledRule.id];

      await refreshRulesList();
      await assertRulesLength(4);

      // Select only enabled
      await testSubjects.click('ruleStatusFilterButton');
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Select enabled or disabled (e.g. all)
      await testSubjects.click('ruleStatusFilterOption-disabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);

      // Select only disabled
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Select only snoozed
      await testSubjects.click('ruleStatusFilterOption-disabled');
      await testSubjects.click('ruleStatusFilterOption-snoozed');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Select disabled or snoozed
      await testSubjects.click('ruleStatusFilterOption-disabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(3);

      // Select enabled or disabled or snoozed
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);

      // Clear it again because it is still selected
      await testSubjects.click('rules-list-clear-filter');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);
    });

    it('should filter rules by the tag', async () => {
      const rule1 = await createRule({
        supertest,
        tags: ['a'],
      });

      const rule2 = await createRule({
        supertest,
        tags: ['b'],
      });

      const rule3 = await createRule({
        supertest,
        tags: ['a', 'b'],
      });

      const rule4 = await createRule({
        supertest,
        tags: ['b', 'c'],
      });

      const rule5 = await createRule({
        supertest,
        tags: ['c'],
      });

      ruleIdList = [rule1.id, rule2.id, rule3.id, rule4.id, rule5.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await testSubjects.click('ruleTagFilter');

      // Select a -> selected: a
      await testSubjects.click('ruleTagFilterOption-a');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Unselect a -> selected: none
      await testSubjects.click('ruleTagFilterOption-a');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(5);

      // Select a, b -> selected: a, b
      await testSubjects.click('ruleTagFilterOption-a');
      await testSubjects.click('ruleTagFilterOption-b');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(4);

      // Unselect a, b, select c -> selected: c
      await testSubjects.click('ruleTagFilterOption-a');
      await testSubjects.click('ruleTagFilterOption-b');
      await testSubjects.click('ruleTagFilterOption-c');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(2);

      // Clear it again because it is still selected
      await testSubjects.click('rules-list-clear-filter');
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
      await assertRulesLength(5);
    });

    it('should not prevent rules with action execution capabilities from being edited', async () => {
      const action = await createIndexConnector({
        supertest,
        name: 'Index Connector: Alerting API test',
        indexName: '.alerts-observability.apm.alerts-default',
      });
      expect(action).not.toBe(undefined);

      const rule1 = await createRule({
        supertest,
        actions: [
          {
            group: 'threshold_met',
            id: action.id,
            params: {
              documents: [{ a: '2' }],
            },
            frequency: {
              notify_when: 'onActiveAlert',
              throttle: null,
              summary: false,
            },
          },
        ],
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await assertRulesLength(1);

      const actionButton = await testSubjects.find('selectActionButton');
      const disabled = await actionButton.getAttribute('disabled');
      expect(disabled).toEqual(null);
    });

    it('should allow rules to be snoozed using the right side dropdown', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await assertRulesLength(1);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('snoozeButton');
      await testSubjects.click('ruleSnoozeApply');

      await find.byCssSelector(
        '[data-test-subj="rulesListNotifyBadge-unsnoozed"]:not(.euiButton-isDisabled)'
      );
      await testSubjects.existOrFail('rulesListNotifyBadge-snoozed');
    });

    it('should allow rules to be snoozed indefinitely using the right side dropdown', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await refreshRulesList();
      await assertRulesLength(1);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('snoozeButton');
      await testSubjects.click('ruleSnoozeIndefiniteApply');

      await find.byCssSelector(
        '[data-test-subj="rulesListNotifyBadge-unsnoozed"]:not(.euiButton-isDisabled)'
      );
      await testSubjects.existOrFail('rulesListNotifyBadge-snoozedIndefinitely');
    });

    it('should allow snoozed rules to be unsnoozed using the right side dropdown', async () => {
      const rule1 = await createRule({
        supertest,
      });

      ruleIdList = [rule1.id];

      await snoozeRule({
        supertest,
        ruleId: rule1.id,
      });

      await refreshRulesList();
      await assertRulesLength(1);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('snoozeButton');
      await testSubjects.click('ruleSnoozeCancel');

      await find.byCssSelector(
        '[data-test-subj="rulesListNotifyBadge-snoozed"]:not(.euiButton-isDisabled)'
      );
      await retry.try(async () => {
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();
        expect(toastText).toEqual('Rules notification successfully unsnoozed');
      });

      await testSubjects.missingOrFail('rulesListNotifyBadge-snoozed');
      await testSubjects.missingOrFail('rulesListNotifyBadge-snoozedIndefinitely');
    });
  });
};
