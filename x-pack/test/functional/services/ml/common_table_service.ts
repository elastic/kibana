/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export type MlTableService = ReturnType<typeof MlTableServiceProvider>;

export function MlTableServiceProvider({ getPageObject, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const commonPage = getPageObject('common');

  const TableService = class {
    constructor(
      public readonly tableTestSubj: string,
      public readonly tableRowSubj: string,
      public readonly columns: Array<{ id: string; testSubj: string }>,
      public readonly searchInputSubj: string
    ) {}

    public async assertTableLoaded() {
      await testSubjects.existOrFail(`~${this.tableTestSubj} loaded`);
    }

    public async assertTableLoading() {
      await testSubjects.existOrFail(`~${this.tableTestSubj} loading`);
    }

    public async parseTable() {
      const table = await testSubjects.find(`~${this.tableTestSubj}`);
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects(`~${this.tableRowSubj}`).toArray()) {
        const $tr = $(tr);

        const rowObject = this.columns.reduce((acc, curr) => {
          acc[curr.id] = $tr
            .findTestSubject(curr.testSubj)
            .find('.euiTableCellContent')
            .text()
            .trim();
          return acc;
        }, {} as Record<typeof this.columns[number]['id'], string>);

        rows.push(rowObject);
      }

      return rows;
    }

    public async assertRowsNumberPerPage(rowsNumber: 10 | 25 | 50 | 100) {
      const textContent = await testSubjects.getVisibleText(
        `~${this.tableTestSubj} > tablePaginationPopoverButton`
      );
      expect(textContent).to.be(`Rows per page: ${rowsNumber}`);
    }

    public async waitForTableToStartLoading() {
      await testSubjects.existOrFail(`~${this.tableTestSubj}`, { timeout: 60 * 1000 });
      await testSubjects.existOrFail(`${this.tableTestSubj} loading`, { timeout: 30 * 1000 });
    }

    public async waitForTableToLoad() {
      await testSubjects.existOrFail(`~${this.tableTestSubj}`, { timeout: 60 * 1000 });
      await testSubjects.existOrFail(`${this.tableTestSubj} loaded`, { timeout: 30 * 1000 });
    }

    async getSearchInput(): Promise<WebElementWrapper> {
      return await testSubjects.find(this.searchInputSubj);
    }

    public async assertSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(queryString: string, expectedRowCount: number = 1) {
      await this.waitForTableToLoad();
      const searchBarInput = await this.getSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(queryString);
      await commonPage.pressEnterKey();
      await this.assertSearchInputValue(queryString);
      await this.waitForTableToStartLoading();
      await this.waitForTableToLoad();

      const rows = await this.parseTable();

      expect(rows).to.have.length(
        expectedRowCount,
        `Filtered table should have ${expectedRowCount} row(s) for filter '${queryString}' (got ${rows.length} matching  items)`
      );
    }
  };

  return {
    getServiceInstance(
      name: string,
      tableTestSubj: string,
      tableRowSubj: string,
      columns: Array<{ id: string; testSubj: string }>,
      searchInputSubj: string
    ) {
      Object.defineProperty(TableService, 'name', { value: name });
      return new TableService(tableTestSubj, tableRowSubj, columns, searchInputSubj);
    },
  };
}
