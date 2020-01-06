/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsTableProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return new (class AnalyticsTable {
    public async parseAnalyticsTable() {
      const table = await testSubjects.find('~mlAnalyticsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlAnalyticsTableRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          id: $tr
            .findTestSubject('mlAnalyticsTableColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          sourceIndex: $tr
            .findTestSubject('mlAnalyticsTableColumnSourceIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          destinationIndex: $tr
            .findTestSubject('mlAnalyticsTableColumnDestIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          type: $tr
            .findTestSubject('mlAnalyticsTableColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          status: $tr
            .findTestSubject('mlAnalyticsTableColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          progress: $tr
            .findTestSubject('mlAnalyticsTableColumnProgress')
            .findTestSubject('mlAnalyticsTableProgress')
            .attr('value'),
        });
      }

      return rows;
    }

    public async refreshAnalyticsTable() {
      await testSubjects.click('mlAnalyticsRefreshListButton');
      await this.waitForAnalyticsToLoad();
    }

    public async waitForAnalyticsToLoad() {
      await testSubjects.existOrFail('~mlAnalyticsTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlAnalyticsTable loaded', { timeout: 30 * 1000 });
    }

    async getAnalyticsSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('mlAnalyticsTableContainer');
      return await tableListContainer.findByClassName('euiFieldSearch');
    }

    async assertAnalyticsSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getAnalyticsSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Analytics search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(filter: string) {
      await this.waitForAnalyticsToLoad();
      const searchBarInput = await this.getAnalyticsSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await this.assertAnalyticsSearchInputValue(filter);
    }

    public async assertAnalyticsRowFields(analyticsId: string, expectedRow: object) {
      const rows = await this.parseAnalyticsTable();
      const analyticsRow = rows.filter(row => row.id === analyticsId)[0];
      expect(analyticsRow).to.eql(expectedRow);
    }
  })();
}
