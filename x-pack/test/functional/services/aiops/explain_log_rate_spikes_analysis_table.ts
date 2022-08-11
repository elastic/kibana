/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';

type ExpectedSectionTableEntries = Record<string, string>;
export interface ExpectedSectionTable {
  section: string;
  expectedEntries: ExpectedSectionTableEntries;
}

export type AnalyticsTableRowDetails = Record<'jobDetails', ExpectedSectionTable[]>;

export type ExplainLogRateSpikesAnalysisTable = ProvidedType<
  typeof ExplainLogRateSpikesAnalysisTableProvider
>;

export function ExplainLogRateSpikesAnalysisTableProvider({
  getPageObject,
  getService,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return new (class AnalysisTable {
    public async assertSpikeAnalysisTableExist() {
      await testSubjects.existOrFail(`aiopsSpikeAnalysisTable`);
    }

    public async parseAnalysisTable() {
      const table = await testSubjects.find('~aiopsSpikeAnalysisTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~aiopsSpikeAnalysisTableRow').toArray()) {
        const $tr = $(tr);

        const rowObject: {
          fieldName: string;
          fieldValue: string;
          logRate: string;
          pValue: string;
          impact: string;
        } = {
          fieldName: $tr
            .findTestSubject('aiopsSpikeAnalysisTableColumnFieldName')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          fieldValue: $tr
            .findTestSubject('aiopsSpikeAnalysisTableColumnFieldValue')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          logRate: $tr
            .findTestSubject('aiopsSpikeAnalysisTableColumnLogRate')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          pValue: $tr
            .findTestSubject('aiopsSpikeAnalysisTableColumnPValue')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          impact: $tr
            .findTestSubject('aiopsSpikeAnalysisTableColumnImpact')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        rows.push(rowObject);
      }

      return rows;
    }

    public rowSelector(analyticsId: string, subSelector?: string) {
      const row = `~mlAnalyticsTable > ~row-${analyticsId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async assertAnalyticsRowFields(
      fieldName: string,
      fieldValue: string,
      expectedRow: object
    ) {
      const rows = await this.parseAnalysisTable();
      const analyticsRow = rows.filter(
        (row) => row.fieldName === fieldName && row.fieldValue === fieldValue
      )[0];
      expect(analyticsRow).to.eql(
        expectedRow,
        `Expected analytics row to be '${JSON.stringify(expectedRow)}' (got '${JSON.stringify(
          analyticsRow
        )}')`
      );
    }
  })();
}
