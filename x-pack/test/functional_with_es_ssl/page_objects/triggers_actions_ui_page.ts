/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const ENTER_KEY = '\uE007';

export function TriggersActionsPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  return {
    async getSectionHeadingText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async clickCreateConnectorButton() {
      const createBtn = await find.byCssSelector(
        '[data-test-subj="createActionButton"],[data-test-subj="createFirstActionButton"]'
      );
      await createBtn.click();
    },
    async searchConnectors(searchText: string) {
      const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector('[data-test-subj="actionsList"]:not(.euiBasicTable-loading)');
    },
    async searchAlerts(searchText: string) {
      const searchBox = await find.byCssSelector('[data-test-subj="alertsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector('[data-test-subj="alertsList"]:not(.euiBasicTable-loading)');
    },
    async getConnectorsList() {
      const table = await find.byCssSelector('[data-test-subj="actionsList"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('connectors-row')
        .toArray()
        .map(row => {
          return {
            name: $(row)
              .findTestSubject('connectorsTableCell-name')
              .find('.euiTableCellContent')
              .text(),
            actionType: $(row)
              .findTestSubject('connectorsTableCell-actionType')
              .find('.euiTableCellContent')
              .text(),
            referencedByCount: $(row)
              .findTestSubject('connectorsTableCell-referencedByCount')
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
        .map(row => {
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
    async changeTabs(tab: 'alertsTab' | 'connectorsTab') {
      return await testSubjects.click(tab);
    },
  };
}
