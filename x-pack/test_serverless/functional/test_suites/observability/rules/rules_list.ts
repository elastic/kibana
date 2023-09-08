/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createInventoryRule,
  disableRule,
} from '../../../../api_integration/test_suites/common/alerting/helpers/alerting_api_helper';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlTriggersActionsUI = getPageObject('svlTriggersActionsUI');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');
  const toasts = getService('toasts');

  async function refreshRulesList() {
    await svlCommonNavigation.sidenav.clickLink({ text: 'Alerts' });
    await testSubjects.click('manageRulesPageButton');
  }

  describe('Rules list', () => {
    let ruleIdList: string[];
    beforeEach(async () => {
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

    it('should display alerts in alphabetical order', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'b',
      });
      const createdRule2 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'c',
      });
      const createdRule3 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
      });

      ruleIdList = [createdRule1.id, createdRule2.id, createdRule3.id];

      await refreshRulesList();
      const searchResults = await svlTriggersActionsUI.getRulesList();

      expect(searchResults.length).toEqual(3);
      expect(searchResults[0].name).toEqual('aInventory');
      expect(searchResults[1].name).toEqual('bInventory');
      expect(searchResults[2].name).toEqual('cInventory');
    });

    it('should search for alert', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'some_name',
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      const searchResults = await svlTriggersActionsUI.getRulesList();
      await svlTriggersActionsUI.searchRules(createdRule1.name);

      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual(`${createdRule1.name}Inventory`);
      expect(searchResults[0].interval).toEqual('1 min');
      expect(searchResults[0].tags).toEqual('2');
      expect(searchResults[0].duration).toMatch(/\d{2,}:\d{2}/);
    });

    it('should update alert list on the search clear button click', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'b',
      });

      const createdRule2 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'c',
        tags: [],
      });

      ruleIdList = [createdRule1.id, createdRule2.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await svlTriggersActionsUI.searchRules('b');
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );
      await retry.try(async () => {
        const searchResults = await svlTriggersActionsUI.getRulesList();
        expect(searchResults.length).toEqual(1);
        expect(searchResults[0].name).toEqual('bInventory');
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
        expect(searchResultsAfterClear[0].name).toEqual('bInventory');
        expect(searchResultsAfterClear[0].interval).toEqual('1 min');
        expect(searchResultsAfterClear[0].tags).toEqual('2');
        expect(searchResultsAfterClear[0].duration).toMatch(/\d{2,}:\d{2}/);
        expect(searchResultsAfterClear[1].name).toEqual('cInventory');
        expect(searchResultsAfterClear[1].interval).toEqual('1 min');
        expect(searchResultsAfterClear[1].tags).toEqual('');
        expect(searchResultsAfterClear[1].duration).toMatch(/\d{2,}:\d{2}/);
      });
    });

    it('should search for tags', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
        tags: ['tag', 'tagtag', 'taggity tag'],
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();
      await testSubjects.click('dataGridColumnSelectorButton');
      await testSubjects.click('dataGridColumnSelectorShowAllButton');

      await svlTriggersActionsUI.searchRules(`${createdRule1.name} tag`);
      const searchResults = await svlTriggersActionsUI.getRulesList();

      expect(searchResults.length).toEqual(1);
      expect(searchResults[0].name).toEqual(`${createdRule1.name}Inventory`);
      expect(searchResults[0].interval).toEqual('1 min');
      expect(searchResults[0].tags).toEqual('3');
      expect(searchResults[0].duration).toMatch(/\d{2,}:\d{2}/);
    });

    it('should display an empty list when search did not return any alerts', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(`An Alert That For Sure Doesn't Exist!`);
      expect(await svlTriggersActionsUI.isRulesListDisplayed()).toEqual(true);
    });

    it('should disable single alert', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();

      await svlTriggersActionsUI.searchRules(createdRule1.name);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('disableButton');

      await refreshRulesList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        createdRule1.name,
        'statusDropdown',
        'disabled'
      );
    });

    it('should re-enable single alert', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
      });

      ruleIdList = [createdRule1.id];

      await disableRule({ supertest, ruleId: createdRule1.id });
      await refreshRulesList();

      await svlTriggersActionsUI.searchRules(createdRule1.name);

      await testSubjects.click('collapsedItemActions');

      await retry.waitForWithTimeout('disable button to show up', 30000, async () => {
        return await testSubjects.isDisplayed('disableButton');
      });

      await testSubjects.click('disableButton');

      await refreshRulesList();
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        createdRule1.name,
        'statusDropdown',
        'enabled'
      );
    });

    it('should delete single alert', async () => {
      await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
      });

      const createdRule2 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'b',
      });

      ruleIdList = [createdRule2.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(createdRule2.name);

      await testSubjects.click('collapsedItemActions');
      await testSubjects.click('deleteRule');
      await testSubjects.exists('rulesDeleteIdsConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const resultToast = await toasts.getToastElement(1);
        const toastText = await resultToast.getVisibleText();
        expect(toastText).toEqual('Deleted 1 rule');
      });

      await svlTriggersActionsUI.searchRules(createdRule2.name);
      const searchResultsAfterDelete = await svlTriggersActionsUI.getRulesList();
      expect(searchResultsAfterDelete.length).toEqual(0);
    });

    it('should disable all selection', async () => {
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'b',
      });

      ruleIdList = [createdRule1.id];

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(createdRule1.name);

      await testSubjects.click(`checkboxSelectRow-${createdRule1.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkDisable');

      await retry.try(async () => {
        const resultToast = await toasts.getToastElement(1);
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
      const createdRule1 = await createInventoryRule({
        supertest,
        consumer: 'alerts',
        name: 'a',
      });

      ruleIdList = [createdRule1.id];

      await disableRule({ supertest, ruleId: createdRule1.id });

      await refreshRulesList();
      await svlTriggersActionsUI.searchRules(createdRule1.name);

      await testSubjects.click(`checkboxSelectRow-${createdRule1.id}`);
      await testSubjects.click('bulkAction');
      await testSubjects.click('bulkEnable');

      await svlTriggersActionsUI.ensureRuleActionStatusApplied(
        createdRule1.name,
        'statusDropdown',
        'enabled'
      );
    });
  });
};
