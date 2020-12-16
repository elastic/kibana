/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test/types/ftr';
import { FtrProviderContext } from '../../ftr_provider_context';
export type MlDataVisualizerTable = ProvidedType<typeof MachineLearningDataVisualizerTableProvider>;

export function MachineLearningDataVisualizerTableProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return new (class DataVisualizerTable {
    public async parseDataVisualizerTable() {
      const table = await testSubjects.find('~mlDataVisualizerTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlDataVisualizerRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          type: $tr
            .findTestSubject('mlDataVisualizerTableColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          fieldName: $tr
            .findTestSubject('mlDataVisualizerTableColumnName')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          documentsCount: $tr
            .findTestSubject('mlDataVisualizerTableColumnDocumentsCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          distinctValues: $tr
            .findTestSubject('mlDataVisualizerTableColumnDistinctValues')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          distribution: $tr
            .findTestSubject('mlDataVisualizerTableColumnDistribution')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        });
      }

      return rows;
    }

    public async assertTableRowCount(expectedRowCount: number) {
      await retry.tryForTime(5000, async () => {
        const tableRows = await this.parseDataVisualizerTable();
        expect(tableRows).to.have.length(
          expectedRowCount,
          `Filtered Data Visualizer table should have ${expectedRowCount} row(s) (got '${tableRows.length}')`
        );
      });
    }

    public rowSelector(fieldName: string, subSelector?: string) {
      const row = `~mlDataVisualizerTable > ~row-${fieldName}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async assertRowExists(fieldName: string) {
      await testSubjects.existOrFail(this.rowSelector(fieldName));
    }

    public detailsSelector(fieldName: string, subSelector?: string) {
      const row = `~mlDataVisualizerTable > ~mlDataVisualizerFieldExpandedRow-${fieldName}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureDetailsOpen(fieldName: string) {
      await retry.tryForTime(10000, async () => {
        if (!(await testSubjects.exists(this.detailsSelector(fieldName)))) {
          const selector = this.rowSelector(
            fieldName,
            `mlDataVisualizerDetailsToggle-${fieldName}-arrowDown`
          );
          await testSubjects.click(selector);
          await testSubjects.existOrFail(
            this.rowSelector(fieldName, `mlDataVisualizerDetailsToggle-${fieldName}-arrowUp`),
            {
              timeout: 1000,
            }
          );
          await testSubjects.existOrFail(this.detailsSelector(fieldName), { timeout: 1000 });
        }
      });
    }

    public async ensureDetailsClosed(fieldName: string) {
      await retry.tryForTime(10000, async () => {
        if (await testSubjects.exists(this.detailsSelector(fieldName))) {
          await testSubjects.click(
            this.rowSelector(fieldName, `mlDataVisualizerDetailsToggle-${fieldName}-arrowUp`)
          );
          await testSubjects.existOrFail(
            this.rowSelector(fieldName, `mlDataVisualizerDetailsToggle-${fieldName}-arrowDown`),
            {
              timeout: 1000,
            }
          );
          await testSubjects.missingOrFail(this.detailsSelector(fieldName), { timeout: 1000 });
        }
      });
    }

    public async assertFieldDocCount(fieldName: string, docCountFormatted: string) {
      const docCountFormattedSelector = this.rowSelector(
        fieldName,
        'mlDataVisualizerTableColumnDocumentsCount'
      );
      await testSubjects.existOrFail(docCountFormattedSelector);
      const docCount = await testSubjects.getVisibleText(docCountFormattedSelector);
      expect(docCount).to.eql(
        docCountFormatted,
        `Expected field document count to be '${docCountFormatted}' (got '${docCount}')`
      );
    }

    public async assertFieldDistinctValuesExist(fieldName: string) {
      const selector = this.rowSelector(fieldName, 'mlDataVisualizerTableColumnDistinctValues');
      await testSubjects.existOrFail(selector);
    }

    public async assertFieldDistributionExist(fieldName: string) {
      const selector = this.rowSelector(fieldName, 'mlDataVisualizerTableColumnDistribution');
      await testSubjects.existOrFail(selector);
    }
  })();
}
