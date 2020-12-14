/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../plugins/ml/common/constants/field_types';

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

    public rowSelector(fieldName: string, subSelector?: string) {
      const row = `~mlDataVisualizerTable > ~row-${fieldName}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async assertRowExists(fieldName: string) {
      await testSubjects.existOrFail(this.rowSelector(fieldName));
    }

    public async expandRowDetails(fieldName: string, fieldType: string) {
      const selector = this.rowSelector(
        fieldName,
        `mlDataVisualizerToggleDetails ${fieldName} arrowDown`
      );
      await testSubjects.existOrFail(selector);
      await testSubjects.click(selector);
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(
          this.rowSelector(fieldName, `mlDataVisualizerToggleDetails ${fieldName} arrowUp`)
        );
        await testSubjects.existOrFail(
          `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType}`
        );
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
        `Expected total document count to be '${docCountFormatted}' (got '${docCount}')`
      );
    }

    public async assertNumberRowContents(fieldName: string, docCountFormatted: string) {
      const fieldType = ML_JOB_FIELD_TYPES.NUMBER;
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);

      await this.expandRowDetails(fieldName, fieldType);

      await testSubjects.existOrFail(
        `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType} > mlNumberSummaryTable`
      );

      await testSubjects.existOrFail(
        `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType} > mlTopValues`
      );
      await testSubjects.existOrFail(
        `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType} > mlMetricDistribution`
      );
    }

    public async assertDateRowContents(fieldName: string, docCountFormatted: string) {
      const fieldType = ML_JOB_FIELD_TYPES.DATE;
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);

      await this.expandRowDetails(fieldName, fieldType);

      await testSubjects.existOrFail(
        `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType} > mlDateSummaryTable`
      );
    }

    public async assertKeywordRowContents(fieldName: string, docCountFormatted: string) {
      const fieldType = ML_JOB_FIELD_TYPES.KEYWORD;
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);

      await this.expandRowDetails(fieldName, fieldType);

      await testSubjects.existOrFail(
        `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType} > mlFieldDataCardTopValues`
      );
    }

    public async assertTextRowContents(fieldName: string, docCountFormatted: string) {
      const fieldType = ML_JOB_FIELD_TYPES.TEXT;
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);

      await this.expandRowDetails(fieldName, fieldType);

      await testSubjects.existOrFail(
        `mlDataVisualizerFieldExpandedRow ${fieldName} ${fieldType} > mlFieldDataCardExamplesList`
      );
    }

    async assertNonMetricCardContents(
      cardType: string,
      fieldName: string,
      docCountFormatted: string
    ) {
      // Currently the data used in the data visualizer tests only contains these field types.
      if (cardType === ML_JOB_FIELD_TYPES.DATE) {
        await this.assertDateRowContents(fieldName, docCountFormatted);
      } else if (cardType === ML_JOB_FIELD_TYPES.KEYWORD) {
        await this.assertKeywordRowContents(fieldName, docCountFormatted!);
      } else if (cardType === ML_JOB_FIELD_TYPES.TEXT) {
        await this.assertTextRowContents(fieldName, docCountFormatted!);
      }
    }
  })();
}
