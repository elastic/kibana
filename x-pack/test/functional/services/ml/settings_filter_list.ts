/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningSettingsFilterListProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async parseFilterListTable() {
      const table = await testSubjects.find('~mlFilterListsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlFilterListRow').toArray()) {
        const $tr = $(tr);

        const inUseSubject = $tr
          .findTestSubject('mlFilterListColumnInUse')
          .findTestSubject('~mlFilterListUsedByIcon')
          .attr('data-test-subj');
        const inUseString = inUseSubject.split(' ')[1];
        const inUse = inUseString === 'inUse' ? true : false;

        rows.push({
          id: $tr
            .findTestSubject('mlFilterListColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('mlFilterListColumnDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          itemCount: $tr
            .findTestSubject('mlFilterListColumnItemCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          inUse,
        });
      }

      return rows;
    },

    rowSelector(filterId: string, subSelector?: string) {
      const row = `~mlFilterListsTable > ~row-${filterId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    },

    async assertFilterListRowExists(filterId: string) {
      return await testSubjects.existOrFail(this.rowSelector(filterId));
    },

    async assertFilterListRowMissing(filterId: string) {
      return await testSubjects.missingOrFail(this.rowSelector(filterId));
    },

    async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      const tableListContainer = await testSubjects.find('mlFilterListTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);

      const rows = await this.parseFilterListTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered filter list table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    },

    async isFilterListRowSelected(filterId: string): Promise<boolean> {
      return await testSubjects.isChecked(
        this.rowSelector(filterId, `checkboxSelectRow-${filterId}`)
      );
    },

    async assertFilterListRowSelected(filterId: string, expectedValue: boolean) {
      const isSelected = await this.isFilterListRowSelected(filterId);
      expect(isSelected).to.eql(
        expectedValue,
        `Expected filter list row for filter list '${filterId}' to be '${
          expectedValue ? 'selected' : 'deselected'
        }' (got '${isSelected ? 'selected' : 'deselected'}')`
      );
    },

    async selectFilterListRow(filterId: string) {
      if ((await this.isFilterListRowSelected(filterId)) === false) {
        await testSubjects.click(this.rowSelector(filterId, `checkboxSelectRow-${filterId}`));
      }

      await this.assertFilterListRowSelected(filterId, true);
    },

    async deselectFilterListRow(filterId: string) {
      if ((await this.isFilterListRowSelected(filterId)) === true) {
        await testSubjects.click(this.rowSelector(filterId, `checkboxSelectRow-${filterId}`));
      }

      await this.assertFilterListRowSelected(filterId, false);
    },

    async selectFilterListRowEditLink(filterId: string) {
      await this.assertFilterListRowExists(filterId);
      await testSubjects.click(this.rowSelector(filterId, `mlEditFilterListLink`));
      await testSubjects.existOrFail('mlPageFilterListEdit');
    },

    async assertCreateFilterListButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListsButtonCreate');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "create filter list" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertDeleteFilterListButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListsDeleteButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete filter list" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async openFilterListEditForm(filterId: string) {
      await testSubjects.click(this.rowSelector(filterId, 'mlEditFilterListLink'));
      await testSubjects.existOrFail('mlPageFilterListEdit');
    },

    async assertEditDescriptionButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListEditDescriptionButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "edit filter list description" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertAddItemButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListAddItemButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "add item" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertDeleteItemButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListDeleteItemButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete item" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertSaveFilterListButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlSaveFilterListButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "save filter list" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    filterItemSelector(filterItem: string, subSelector?: string) {
      const row = `mlGridItem ${filterItem}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    },

    async assertFilterItemExists(filterItem: string) {
      await testSubjects.existOrFail(this.filterItemSelector(filterItem));
    },

    async isFilterItemSelected(filterItem: string): Promise<boolean> {
      return await testSubjects.isChecked(
        this.filterItemSelector(filterItem, 'mlGridItemCheckbox')
      );
    },

    async assertFilterItemSelected(filterItem: string, expectedValue: boolean) {
      const isSelected = await this.isFilterItemSelected(filterItem);
      expect(isSelected).to.eql(
        expectedValue,
        `Expected filter item '${filterItem}' to be '${
          expectedValue ? 'selected' : 'deselected'
        }' (got '${isSelected ? 'selected' : 'deselected'}')`
      );
    },

    async selectFilterItem(filterItem: string) {
      if ((await this.isFilterItemSelected(filterItem)) === false) {
        await testSubjects.click(this.filterItemSelector(filterItem));
      }

      await this.assertFilterItemSelected(filterItem, true);
    },

    async deleteFilterItem(filterItem: string) {
      await testSubjects.existOrFail('mlFilterListDeleteItemButton');
      await this.selectFilterItem(filterItem);
      await testSubjects.click('mlFilterListDeleteItemButton');
      await testSubjects.missingOrFail(this.filterItemSelector(filterItem));
    },

    async deselectFilterItem(filterItem: string) {
      if ((await this.isFilterItemSelected(filterItem)) === true) {
        await testSubjects.click(this.filterItemSelector(filterItem));
      }

      await this.assertFilterItemSelected(filterItem, false);
    },

    async navigateToFilterListCreationPage() {
      await this.assertCreateFilterListButtonEnabled(true);
      await testSubjects.click('mlFilterListsButtonCreate');
      await testSubjects.existOrFail('mlPageFilterListEdit');
    },

    async setFilterListId(filterId: string) {
      const subj = 'mlNewFilterListIdInput';
      await mlCommonUI.setValueWithChecks(subj, filterId, {
        clearWithKeyboard: true,
      });
      const actualFilterListId = await testSubjects.getAttribute(subj, 'value');
      expect(actualFilterListId).to.eql(
        filterId,
        `Filter list id should be '${filterId}' (got '${actualFilterListId}')`
      );
    },

    async setFilterListDescription(description: string) {
      await this.assertEditDescriptionButtonEnabled(true);
      await testSubjects.click('mlFilterListEditDescriptionButton');
      await testSubjects.existOrFail('mlFilterListDescriptionInput');
      await mlCommonUI.setValueWithChecks('mlFilterListDescriptionInput', description, {
        clearWithKeyboard: true,
      });
      await browser.pressKeys(browser.keys.ESCAPE);
      await this.assertFilterListDescriptionEql(description);
    },

    async addFilterListKeywords(keywords: string[]) {
      await this.assertAddItemButtonEnabled(true);
      await testSubjects.click('mlFilterListAddItemButton');
      await mlCommonUI.setValueWithChecks('mlAddFilterListItemTextArea', keywords.join('\n'), {
        clearWithKeyboard: true,
      });
      await testSubjects.existOrFail('mlAddFilterListItemButton');
      await testSubjects.click('mlAddFilterListItemButton');

      for (let index = 0; index < keywords.length; index++) {
        await this.assertFilterItemExists(keywords[index]);
      }
    },

    async assertFilterListDescriptionEql(expectedDescription: string) {
      const actualFilterListDescription = await testSubjects.getVisibleText(
        'mlNewFilterListDescriptionText'
      );
      expect(actualFilterListDescription).to.eql(
        expectedDescription,
        `Filter list description should be '${expectedDescription}' (got '${actualFilterListDescription}')`
      );
    },

    async saveFilterList() {
      await this.assertSaveFilterListButtonEnabled(true);
      await testSubjects.click('mlSaveFilterListButton');
      await testSubjects.existOrFail('mlPageFilterListManagement');
    },
  };
}
