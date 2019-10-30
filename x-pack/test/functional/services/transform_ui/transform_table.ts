/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformTableProvider({ getService }: FtrProviderContext) {
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
  })();
}
