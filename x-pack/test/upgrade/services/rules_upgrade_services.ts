/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import {
  CustomCheerio,
  CustomCheerioStatic,
} from '../../../../test/functional/services/lib/web_element_wrapper/custom_cheerio_api';

export function RulesHelper({ getPageObjects, getService }: FtrProviderContext) {
  const find = getService('find');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const ENTER_KEY = '\uE007';

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
      lastResponse: $(row)
        .findTestSubject('rulesTableCell-lastResponse')
        .find('.euiTableCellContent')
        .text(),
      status: $(row).findTestSubject('rulesTableCell-status').find('.euiTableCellContent').text(),
    };
  }

  return {
    async searchRules(searchText: string) {
      const searchBox = await testSubjects.find('ruleSearchField');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="rulesList"]:not(.euiBasicTable-loading)'
      );
    },
    async getRulesList() {
      const table = await find.byCssSelector('[data-test-subj="rulesList"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('rule-row')
        .toArray()
        .map((row) => {
          return getRowItemData(row, $);
        });
    },

    async isStatus(status: string): Promise<boolean> {
      const actionsDropdown = await testSubjects.find('statusDropdown');
      const currentStatus = await actionsDropdown.getVisibleText();
      if (currentStatus === status) {
        return true;
      }
      return false;
    },

    async changeStatus(status: string) {
      if (await this.isStatus(status)) {
        return;
      }
      const actionsDropdown = await testSubjects.find('statusDropdown');
      await actionsDropdown.click();
      const actionsMenuElem = await testSubjects.find('ruleStatusMenu');
      const actionsMenuItemElem = await actionsMenuElem.findByTestSubject(
        'statusDropdown' + status + 'Item'
      );
      await actionsMenuItemElem.click();
      await actionsDropdown.waitForDeletedByCssSelector('.euiLoadingSpinner');
      await retry.try(async () => {
        await this.getRulesList();
        expect(await this.isStatus(status)).to.eql(true);
      });
    },

    async disableEnableRule() {
      await this.changeStatus('Disabled');
      await this.changeStatus('Enabled');
      const searchResults = await this.getRulesList();
      expect(searchResults[0].lastResponse).to.equal('Pending');
      await browser.refresh();
      await pageObjects.header.waitUntilLoadingHasFinished();
    },
  };
}

export const services = {
  rulesHelper: RulesHelper,
};
