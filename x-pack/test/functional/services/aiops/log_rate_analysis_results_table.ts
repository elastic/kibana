/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function LogRateAnalysisResultsTableProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return new (class AnalysisTable {
    public async assertLogRateAnalysisResultsTableExists() {
      await testSubjects.existOrFail(`aiopsLogRateAnalysisResultsTable`);
    }

    public async parseAnalysisTable() {
      const table = await testSubjects.find('~aiopsLogRateAnalysisResultsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~aiopsLogRateAnalysisResultsTableRow').toArray()) {
        const $tr = $(tr);

        const rowObject: {
          fieldName: string;
          fieldValue: string;
          logRate: string;
          pValue: string;
          impact: string;
        } = {
          fieldName: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsTableColumnFieldName')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          fieldValue: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsTableColumnFieldValue')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          logRate: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsTableColumnLogRate')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          pValue: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsTableColumnPValue')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          impact: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsTableColumnImpact')
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
