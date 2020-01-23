/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformTableProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return new (class TransformTable {
    public async parseTransformTable() {
      const table = await testSubjects.find('~transformListTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~transformListRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          id: $tr
            .findTestSubject('transformListColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('transformListColumnDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          sourceIndex: $tr
            .findTestSubject('transformListColumnSourceIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          destinationIndex: $tr
            .findTestSubject('transformListColumnDestinationIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          status: $tr
            .findTestSubject('transformListColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          mode: $tr
            .findTestSubject('transformListColumnMode')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          progress: $tr
            .findTestSubject('transformListColumnProgress')
            .findTestSubject('transformListProgress')
            .attr('value'),
        });
      }

      return rows;
    }

    async parseEuiInMemoryTable(tableSubj: string) {
      const table = await testSubjects.find(`~${tableSubj}`);
      const $ = await table.parseDomContent();
      const rows = [];

      // For each row, get the content of each cell and
      // add its values as an array to each row.
      for (const tr of $.findTestSubjects(`~${tableSubj}Row`).toArray()) {
        rows.push(
          $(tr)
            .find('.euiTableCellContent')
            .toArray()
            .map(cell =>
              $(cell)
                .text()
                .trim()
            )
        );
      }

      return rows;
    }

    async assertEuiInMemoryTableColumnValues(
      tableSubj: string,
      column: number,
      expectedColumnValues: string[]
    ) {
      await retry.tryForTime(2000, async () => {
        // get a 2D array of rows and cell values
        const rows = await this.parseEuiInMemoryTable(tableSubj);

        // reduce the rows data to an array of unique values in the specified column
        const uniqueColumnValues = rows
          .map(row => row[column])
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);

        uniqueColumnValues.sort();

        // check if the returned unique value matches the supplied filter value
        expect(uniqueColumnValues).to.eql(expectedColumnValues);
      });
    }

    public async refreshTransformList() {
      await testSubjects.click('transformRefreshTransformListButton');
      await this.waitForTransformsToLoad();
    }

    public async waitForTransformsToLoad() {
      await testSubjects.existOrFail('~transformListTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformListTable loaded', { timeout: 30 * 1000 });
    }

    public async filterWithSearchString(filter: string) {
      await this.waitForTransformsToLoad();
      const tableListContainer = await testSubjects.find('transformListTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
    }

    public async assertTransformRowFields(transformId: string, expectedRow: object) {
      const rows = await this.parseTransformTable();
      const transformRow = rows.filter(row => row.id === transformId)[0];
      expect(transformRow).to.eql(expectedRow);
    }

    public async assertTransformExpandedRow() {
      await testSubjects.click('transformListRowDetailsToggle');

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Walk through the rest of the tabs and check if the corresponding content shows up
      await testSubjects.existOrFail('transformJsonTab');
      await testSubjects.click('transformJsonTab');
      await testSubjects.existOrFail('~transformJsonTabContent');

      await testSubjects.existOrFail('transformMessagesTab');
      await testSubjects.click('transformMessagesTab');
      await testSubjects.existOrFail('~transformMessagesTabContent');

      await testSubjects.existOrFail('transformPreviewTab');
      await testSubjects.click('transformPreviewTab');
      await testSubjects.existOrFail('~transformPreviewTabContent');
    }

    public async waitForTransformsExpandedRowPreviewTabToLoad() {
      await testSubjects.existOrFail('~transformPreviewTabContent', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformPreviewTabContent loaded', { timeout: 30 * 1000 });
    }

    async assertTransformsExpandedRowPreviewColumnValues(column: number, values: string[]) {
      await this.waitForTransformsExpandedRowPreviewTabToLoad();
      await this.assertEuiInMemoryTableColumnValues('transformPreviewTabContent', column, values);
    }
  })();
}
