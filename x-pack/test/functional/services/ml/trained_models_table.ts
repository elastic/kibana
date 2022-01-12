/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export interface TrainedModelRowData {
  id: string;
  description: string;
  modelTypes: string[];
}

export type MlTrainedModelsTable = ProvidedType<typeof TrainedModelsTableProvider>;

export function TrainedModelsTableProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new (class ModelsTable {
    public async parseModelsTable() {
      const table = await testSubjects.find('~mlModelsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlModelsTableRow').toArray()) {
        const $tr = $(tr);

        const $types = $tr.findTestSubjects('mlModelType');
        const modelTypes = [];
        for (const el of $types.toArray()) {
          modelTypes.push($(el).text().trim());
        }

        const rowObject: {
          id: string;
          description: string;
          modelTypes: string[];
          createdAt: string;
        } = {
          id: $tr
            .findTestSubject('mlModelsTableColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('mlModelsTableColumnDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          modelTypes,
          createdAt: $tr
            .findTestSubject('mlModelsTableColumnCreatedAt')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        rows.push(rowObject);
      }

      return rows;
    }

    public rowSelector(modelId: string, subSelector?: string) {
      const row = `~mlModelsTable > ~row-${modelId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async waitForRefreshButtonLoaded() {
      await testSubjects.existOrFail('~mlRefreshPageButton', { timeout: 10 * 1000 });
      await testSubjects.existOrFail('mlRefreshPageButton loaded', { timeout: 30 * 1000 });
    }

    public async refreshModelsTable() {
      await this.waitForRefreshButtonLoaded();
      await testSubjects.click('~mlRefreshPageButton');
      await this.waitForRefreshButtonLoaded();
      await this.waitForModelsToLoad();
    }

    public async waitForModelsToLoad() {
      await testSubjects.existOrFail('~mlModelsTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlModelsTable loaded', { timeout: 30 * 1000 });
    }

    async getModelsSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('mlModelsTableContainer');
      return await tableListContainer.findByClassName('euiFieldSearch');
    }

    public async assertModelsSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getModelsSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Trained models search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForModelsToLoad();
      const searchBarInput = await this.getModelsSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await this.assertModelsSearchInputValue(filter);

      const rows = await this.parseModelsTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered trained models table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public async assertModelDisplayedInTable(modelId: string, shouldBeDisplayed: boolean) {
      await retry.tryForTime(5 * 1000, async () => {
        await this.filterWithSearchString(modelId, shouldBeDisplayed === true ? 1 : 0);
      });
    }

    public async assertModelsRowFields(modelId: string, expectedRow: TrainedModelRowData) {
      await this.refreshModelsTable();
      const rows = await this.parseModelsTable();
      const modelRow = rows.filter((row) => row.id === modelId)[0];
      expect(modelRow.id).to.eql(
        expectedRow.id,
        `Expected trained model row ID to be '${expectedRow.id}' (got '${modelRow.id}')`
      );
      expect(modelRow.description).to.eql(
        expectedRow.description,
        `Expected trained model row description to be '${expectedRow.description}' (got '${modelRow.description}')`
      );
      expect(modelRow.modelTypes.sort()).to.eql(
        expectedRow.modelTypes.sort(),
        `Expected trained model row types to be '${JSON.stringify(
          expectedRow.modelTypes
        )}' (got '${JSON.stringify(modelRow.modelTypes)}')`
      );
      // 'Created at' will be different on each run,
      // so we will just assert that the value is in the expected timestamp format.
      expect(modelRow.createdAt).to.match(
        /^\w{3}\s\d+,\s\d{4}\s@\s\d{2}:\d{2}:\d{2}\.\d{3}$/,
        `Expected trained model row created at time to have same format as 'Dec 5, 2019 @ 12:28:34.594' (got '${modelRow.createdAt}')`
      );
    }

    public async assertModelCollapsedActionsButtonExists(modelId: string, expectedValue: boolean) {
      const actionsExists = await testSubjects.exists(
        this.rowSelector(modelId, 'euiCollapsedItemActionsButton')
      );
      expect(actionsExists).to.eql(
        expectedValue,
        `Expected row collapsed actions menu button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionsExists ? 'visible' : 'hidden'})`
      );
    }

    public async assertModelDeleteActionButtonExists(modelId: string, expectedValue: boolean) {
      const actionsExists = await testSubjects.exists(
        this.rowSelector(modelId, 'mlModelsTableRowDeleteAction')
      );
      expect(actionsExists).to.eql(
        expectedValue,
        `Expected row delete action button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionsExists ? 'visible' : 'hidden'})`
      );
    }

    public async assertModelDeleteActionButtonEnabled(modelId: string, expectedValue: boolean) {
      await this.assertModelDeleteActionButtonExists(modelId, true);
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(modelId, 'mlModelsTableRowDeleteAction')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected row delete action button for trained model '${modelId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertDeleteModalExists() {
      await testSubjects.existOrFail('mlModelsDeleteModal', { timeout: 60 * 1000 });
    }

    public async assertDeleteModalNotExists() {
      await testSubjects.missingOrFail('mlModelsDeleteModal', { timeout: 60 * 1000 });
    }

    public async confirmDeleteModel() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertDeleteModalExists();
        await testSubjects.click('mlModelsDeleteModalConfirmButton');
        await this.assertDeleteModalNotExists();
      });
    }

    public async clickDeleteAction(modelId: string) {
      await testSubjects.click(this.rowSelector(modelId, 'mlModelsTableRowDeleteAction'));
      await this.assertDeleteModalExists();
    }
  })();
}
