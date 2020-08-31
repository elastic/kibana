/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const ENTER_KEY = '\uE007';

export function TriggersActionsPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

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
      const searchBox = await testSubjects.find('alertSearchField');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="alertsList"]:not(.euiBasicTable-loading)'
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
      const table = await find.byCssSelector('[data-test-subj="alertsList"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('alert-row')
        .toArray()
        .map((row) => {
          return {
            name: $(row)
              .findTestSubject('alertsTableCell-name')
              .find('.euiTableCellContent')
              .text(),
            tagsText: $(row)
              .findTestSubject('alertsTableCell-tagsText')
              .find('.euiTableCellContent')
              .text(),
            alertType: $(row)
              .findTestSubject('alertsTableCell-alertType')
              .find('.euiTableCellContent')
              .text(),
            interval: $(row)
              .findTestSubject('alertsTableCell-interval')
              .find('.euiTableCellContent')
              .text(),
          };
        });
    },
    async isAlertsListDisplayed() {
      const table = await find.byCssSelector('[data-test-subj="alertsList"] table');
      return table.isDisplayed();
    },
    async isAnEmptyAlertsListDisplayed() {
      await retry.try(async () => {
        const table = await find.byCssSelector('[data-test-subj="alertsList"] table');
        const $ = await table.parseDomContent();
        const rows = $.findTestSubjects('alert-row').toArray();
        expect(rows.length).to.eql(0);
        const emptyRow = await find.byCssSelector(
          '[data-test-subj="alertsList"] table .euiTableRow'
        );
        expect(await emptyRow.getVisibleText()).to.eql('No items found');
      });
      return true;
    },
    async clickOnAlertInAlertsList(name: string) {
      await this.searchAlerts(name);
      await find.clickDisplayedByCssSelector(`[data-test-subj="alertsList"] [title="${name}"]`);
    },
    async changeTabs(tab: 'alertsTab' | 'connectorsTab') {
      await testSubjects.click(tab);
    },
    async toggleSwitch(testSubject: string) {
      const switchBtn = await testSubjects.find(testSubject);
      const valueBefore = await switchBtn.getAttribute('aria-checked');
      await switchBtn.click();
      await retry.try(async () => {
        const switchBtnAfter = await testSubjects.find(testSubject);
        const valueAfter = await switchBtnAfter.getAttribute('aria-checked');
        expect(valueAfter).not.to.eql(valueBefore);
      });
    },
    async clickCreateAlertButton() {
      const createBtn = await find.byCssSelector(
        '[data-test-subj="createAlertButton"],[data-test-subj="createFirstAlertButton"]'
      );
      await createBtn.click();
    },
  };
}
