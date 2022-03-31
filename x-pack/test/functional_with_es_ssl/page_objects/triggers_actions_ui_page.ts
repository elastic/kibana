/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CustomCheerio,
  CustomCheerioStatic,
} from 'test/functional/services/lib/web_element_wrapper/custom_cheerio_api';
import { FtrProviderContext } from '../ftr_provider_context';

const ENTER_KEY = '\uE007';

export function TriggersActionsPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  function getRowItemData(row: CustomCheerio, $: CustomCheerioStatic) {
    return {
      name: $(row).findTestSubject('rulesTableCell-name').find('.euiTableCellContent').text(),
      duration: $(row)
        .findTestSubject('rulesTableCell-duration')
        .find('.euiTableCellContent')
        .text(),
      interval: $(row)
        .findTestSubject('rulesTableCell-interval')
        .find('.euiTableCellContent')
        .text(),
      tags: $(row)
        .findTestSubject('rulesTableCell-tagsPopover')
        .find('.euiTableCellContent')
        .text(),
    };
  }

  return {
    async getSectionHeadingText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async clickCreateFirstConnectorButton() {
      const createBtn = await testSubjects.find('createFirstActionButton');
      const createBtnIsVisible = await createBtn.isDisplayed();
      if (createBtnIsVisible) {
        await createBtn.click();
      }
    },
    async clickCreateConnectorButton() {
      const createBtn = await testSubjects.find('createActionButton');
      const createBtnIsVisible = await createBtn.isDisplayed();
      if (createBtnIsVisible) {
        await createBtn.click();
      } else {
        await this.clickCreateFirstConnectorButton();
      }
    },
    async searchConnectors(searchText: string) {
      const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)'
      );
    },
    async searchAlerts(searchText: string) {
      const searchBox = await testSubjects.find('ruleSearchField');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );
    },
    async getConnectorsList() {
      const table = await find.byCssSelector('[data-test-subj="actionsList"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('connectors-row')
        .toArray()
        .map((row) => {
          return {
            name: $(row)
              .findTestSubject('connectorsTableCell-name')
              .find('.euiTableCellContent')
              .text(),
            actionType: $(row)
              .findTestSubject('connectorsTableCell-actionType')
              .find('.euiTableCellContent')
              .text(),
          };
        });
    },
    async getAlertsList() {
      const table = await find.byCssSelector('[data-test-subj="rulesList"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('rule-row')
        .toArray()
        .map((row) => {
          return getRowItemData(row, $);
        });
    },
    async getAlertsListWithStatus() {
      const table = await find.byCssSelector('[data-test-subj="rulesList"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('rule-row')
        .toArray()
        .map((row) => {
          const rowItem = getRowItemData(row, $);
          return {
            ...rowItem,
            status: $(row)
              .findTestSubject('rulesTableCell-lastResponse')
              .find('.euiTableCellContent')
              .text(),
          };
        });
    },
    async isAlertsListDisplayed() {
      const table = await find.byCssSelector('[data-test-subj="rulesList"] table');
      return table.isDisplayed();
    },
    async isAnEmptyAlertsListDisplayed() {
      await retry.try(async () => {
        const table = await find.byCssSelector('[data-test-subj="rulesList"] table');
        const $ = await table.parseDomContent();
        const rows = $.findTestSubjects('rule-row').toArray();
        expect(rows.length).to.eql(0);
        const emptyRow = await find.byCssSelector(
          '[data-test-subj="rulesList"] table .euiTableRow'
        );
        expect(await emptyRow.getVisibleText()).to.eql('No items found');
      });
      return true;
    },
    async clickOnAlertInAlertsList(name: string) {
      await this.searchAlerts(name);
      await find.clickDisplayedByCssSelector(`[data-test-subj="rulesList"] [title="${name}"]`);
    },
    async maybeClickOnAlertTab() {
      if (await testSubjects.exists('ruleDetailsTabbedContent')) {
        const alertTab = await testSubjects.find('ruleAlertListTab');
        await alertTab.click();
      }
    },
    async changeTabs(tab: 'rulesTab' | 'connectorsTab') {
      await testSubjects.click(tab);
    },
    async toggleSwitch(testSubject: string) {
      const switchBtn = await testSubjects.find(testSubject);
      await switchBtn.click();
    },
    async clickCreateAlertButton() {
      const createBtn = await find.byCssSelector(
        '[data-test-subj="createRuleButton"],[data-test-subj="createFirstRuleButton"]'
      );
      await createBtn.click();
    },
    async setAlertName(value: string) {
      await testSubjects.setValue('ruleNameInput', value);
      await this.assertAlertName(value);
    },
    async assertAlertName(expectedValue: string) {
      const actualValue = await testSubjects.getAttribute('ruleNameInput', 'value');
      expect(actualValue).to.eql(expectedValue);
    },
    async setAlertInterval(value: number, unit?: 's' | 'm' | 'h' | 'd') {
      await testSubjects.setValue('intervalInput', value.toString());
      if (unit) {
        await testSubjects.selectValue('intervalInputUnit', unit);
      }
      await this.assertAlertInterval(value, unit);
    },
    async assertAlertInterval(expectedValue: number, expectedUnit?: 's' | 'm' | 'h' | 'd') {
      const actualValue = await testSubjects.getAttribute('intervalInput', 'value');
      expect(actualValue).to.eql(expectedValue);
      if (expectedUnit) {
        const actualUnitValue = await testSubjects.getAttribute('intervalInputUnit', 'value');
        expect(actualUnitValue).to.eql(expectedUnit);
      }
    },
    async saveAlert() {
      await testSubjects.click('saveRuleButton');
      const isConfirmationModalVisible = await testSubjects.isDisplayed('confirmRuleSaveModal');
      expect(isConfirmationModalVisible).to.eql(true, 'Expect confirmation modal to be visible');
      await testSubjects.click('confirmModalConfirmButton');
    },
    async ensureRuleActionStatusApplied(
      ruleName: string,
      controlName: string,
      expectedStatus: string
    ) {
      await retry.tryForTime(30000, async () => {
        await this.searchAlerts(ruleName);
        const statusControl = await testSubjects.find(controlName);
        const title = await statusControl.getAttribute('title');
        expect(title.toLowerCase()).to.eql(expectedStatus.toLowerCase());
      });
    },
    async ensureEventLogColumnExists(columnId: string) {
      const columnsButton = await testSubjects.find('dataGridColumnSelectorButton');
      await columnsButton.click();

      const button = await testSubjects.find(
        `dataGridColumnSelectorToggleColumnVisibility-${columnId}`
      );
      const isChecked = await button.getAttribute('aria-checked');

      if (isChecked === 'false') {
        await button.click();
      }

      await columnsButton.click();
    },
    async sortEventLogColumn(columnId: string, direction: string) {
      await testSubjects.click(`dataGridHeaderCell-${columnId}`);
      const popover = await testSubjects.find(`dataGridHeaderCellActionGroup-${columnId}`);
      const popoverListItems = await popover.findAllByCssSelector('li');

      if (direction === 'asc') {
        await popoverListItems[1].click();
      }
      if (direction === 'desc') {
        await popoverListItems[2].click();
      }
    },
  };
}
