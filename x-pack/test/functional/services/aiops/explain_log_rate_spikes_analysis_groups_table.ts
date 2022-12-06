/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function ExplainLogRateSpikesAnalysisGroupsTableProvider({
  getService,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return new (class AnalysisTable {
    public async assertSpikeAnalysisTableExists() {
      await testSubjects.existOrFail(`aiopsSpikeAnalysisGroupsTable`);
    }

    public async assertExpandRowButtonExists() {
      await testSubjects.existOrFail('aiopsSpikeAnalysisGroupsTableRowExpansionButton');
    }

    public async expandRow() {
      await testSubjects.click('aiopsSpikeAnalysisGroupsTableRowExpansionButton');
      await testSubjects.existOrFail('aiopsSpikeAnalysisTable');
    }

    public async parseAnalysisTable() {
      const table = await testSubjects.find('~aiopsSpikeAnalysisGroupsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~aiopsSpikeAnalysisGroupsTableRow').toArray()) {
        const $tr = $(tr);

        const rowObject: {
          group: any;
          docCount: string;
        } = {
          group: $tr
            .findTestSubject('aiopsSpikeAnalysisGroupsTableColumnGroup')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          docCount: $tr
            .findTestSubject('aiopsSpikeAnalysisGroupsTableColumnDocCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        rows.push(rowObject);
      }

      return rows;
    }
  })();
}
