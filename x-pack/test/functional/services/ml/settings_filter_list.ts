/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSettingsFilterListProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async parseFilterListTable() {
      const table = await testSubjects.find('~mlFilterListsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlCalendarListRow').toArray()) {
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

    async deselectFilterItem(filterItem: string) {
      if ((await this.isFilterItemSelected(filterItem)) === true) {
        await testSubjects.click(this.filterItemSelector(filterItem));
      }

      await this.assertFilterItemSelected(filterItem, false);
    },
  };
}
