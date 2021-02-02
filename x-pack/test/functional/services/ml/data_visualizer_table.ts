/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test/types/ftr';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../plugins/ml/common/constants/field_types';
import { MlCommonUI } from './common_ui';
export type MlDataVisualizerTable = ProvidedType<typeof MachineLearningDataVisualizerTableProvider>;

export function MachineLearningDataVisualizerTableProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
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
          `Data Visualizer table should have ${expectedRowCount} row(s) (got '${tableRows.length}')`
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

    public async assertSearchPanelExist() {
      await testSubjects.existOrFail(`mlDataVisualizerSearchPanel`);
    }

    public async assertFieldNameInputExists() {
      await testSubjects.existOrFail('mlDataVisualizerFieldNameSelect');
    }

    public async assertFieldTypeInputExists() {
      await testSubjects.existOrFail('mlDataVisualizerFieldTypeSelect');
    }

    public async assertSampleSizeInputExists() {
      await testSubjects.existOrFail('mlDataVisualizerShardSizeSelect');
    }

    public async setSampleSizeInputValue(
      sampleSize: number,
      fieldName: string,
      docCountFormatted: string
    ) {
      await this.assertSampleSizeInputExists();
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerShardSizeSelect');
      await testSubjects.existOrFail(`mlDataVisualizerShardSizeOption ${sampleSize}`);
      await testSubjects.click(`mlDataVisualizerShardSizeOption ${sampleSize}`);

      await retry.tryForTime(5000, async () => {
        await this.assertFieldDocCount(fieldName, docCountFormatted);
      });
    }

    public async setFieldTypeFilter(fieldTypes: string[], expectedRowCount = 1) {
      await this.assertFieldTypeInputExists();
      await mlCommonUI.setMultiSelectFilter('mlDataVisualizerFieldTypeSelect', fieldTypes);
      await this.assertTableRowCount(expectedRowCount);
    }

    async removeFieldTypeFilter(fieldTypes: string[], expectedRowCount = 1) {
      await this.assertFieldTypeInputExists();
      await mlCommonUI.removeMultiSelectFilter('mlDataVisualizerFieldTypeSelect', fieldTypes);
      await this.assertTableRowCount(expectedRowCount);
    }

    public async setFieldNameFilter(fieldNames: string[], expectedRowCount = 1) {
      await this.assertFieldNameInputExists();
      await mlCommonUI.setMultiSelectFilter('mlDataVisualizerFieldNameSelect', fieldNames);
      await this.assertTableRowCount(expectedRowCount);
    }

    public async removeFieldNameFilter(fieldNames: string[], expectedRowCount: number) {
      await this.assertFieldNameInputExists();
      await mlCommonUI.removeMultiSelectFilter('mlDataVisualizerFieldNameSelect', fieldNames);
      await this.assertTableRowCount(expectedRowCount);
    }

    public async assertShowEmptyFieldsSwitchExists() {
      await testSubjects.existOrFail('mlDataVisualizerShowEmptyFieldsSwitch');
    }

    public async assertShowEmptyFieldsCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlDataVisualizerShowEmptyFieldsSwitch',
          'aria-checked'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Show empty fields check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
      return actualCheckState === expectedCheckState;
    }

    public async setShowEmptyFieldsSwitchState(checkState: boolean, expectedEmptyFields: string[]) {
      await this.assertShowEmptyFieldsSwitchExists();
      await retry.tryForTime(5000, async () => {
        if (await this.assertShowEmptyFieldsCheckState(!checkState)) {
          await testSubjects.click('mlDataVisualizerShowEmptyFieldsSwitch');
        }
        await this.assertShowEmptyFieldsCheckState(checkState);
        for (const field of expectedEmptyFields) {
          await this.assertRowExists(field);
        }
      });
    }

    public async assertTopValuesContents(fieldName: string, expectedTopValuesCount: number) {
      const selector = this.detailsSelector(fieldName, 'mlFieldDataTopValues');
      const topValuesElement = await testSubjects.find(selector);
      const topValuesBars = await topValuesElement.findAllByTestSubject('mlFieldDataTopValueBar');
      expect(topValuesBars).to.have.length(
        expectedTopValuesCount,
        `Expected top values count for field '${fieldName}' to be '${expectedTopValuesCount}' (got '${topValuesBars.length}')`
      );
    }

    public async assertDistributionPreviewExist(fieldName: string) {
      await testSubjects.existOrFail(this.rowSelector(fieldName, `mlDataGridChart-${fieldName}`));
      await testSubjects.existOrFail(
        this.rowSelector(fieldName, `mlDataGridChart-${fieldName}-histogram`)
      );
    }

    public async assertNumberFieldContents(
      fieldName: string,
      docCountFormatted: string,
      topValuesCount: number,
      checkDistributionPreviewExist = true
    ) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(this.detailsSelector(fieldName, 'mlNumberSummaryTable'));

      await testSubjects.existOrFail(this.detailsSelector(fieldName, 'mlTopValues'));
      await this.assertTopValuesContents(fieldName, topValuesCount);

      if (checkDistributionPreviewExist) {
        await this.assertDistributionPreviewExist(fieldName);
      }

      await this.ensureDetailsClosed(fieldName);
    }

    public async assertDateFieldContents(fieldName: string, docCountFormatted: string) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(this.detailsSelector(fieldName, 'mlDateSummaryTable'));
      await this.ensureDetailsClosed(fieldName);
    }

    public async assertKeywordFieldContents(
      fieldName: string,
      docCountFormatted: string,
      topValuesCount: number
    ) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(this.detailsSelector(fieldName, 'mlFieldDataTopValues'));
      await this.assertTopValuesContents(fieldName, topValuesCount);
      await this.ensureDetailsClosed(fieldName);
    }

    public async assertExamplesList(fieldName: string, expectedExamplesCount: number) {
      const examplesList = await testSubjects.find(
        this.detailsSelector(fieldName, 'mlFieldDataExamplesList')
      );
      const examplesListItems = await examplesList.findAllByTagName('li');
      expect(examplesListItems).to.have.length(
        expectedExamplesCount,
        `Expected example list item count for field '${fieldName}' to be '${expectedExamplesCount}' (got '${examplesListItems.length}')`
      );
    }
    public async assertTextFieldContents(
      fieldName: string,
      docCountFormatted: string,
      expectedExamplesCount: number
    ) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await this.assertExamplesList(fieldName, expectedExamplesCount);
      await this.ensureDetailsClosed(fieldName);
    }

    public async assertGeoPointFieldContents(
      fieldName: string,
      docCountFormatted: string,
      expectedExamplesCount: number
    ) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await this.assertExamplesList(fieldName, expectedExamplesCount);

      await testSubjects.existOrFail(this.detailsSelector(fieldName, 'mlEmbeddedMapContent'));

      await this.ensureDetailsClosed(fieldName);
    }

    public async assertUnknownFieldContents(fieldName: string, docCountFormatted: string) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(this.detailsSelector(fieldName, 'mlDVDocumentStatsContent'));

      await this.ensureDetailsClosed(fieldName);
    }

    public async assertNonMetricFieldContents(
      fieldType: string,
      fieldName: string,
      docCountFormatted: string,
      exampleCount: number
    ) {
      // Currently the data used in the data visualizer tests only contains these field types.
      if (fieldType === ML_JOB_FIELD_TYPES.DATE) {
        await this.assertDateFieldContents(fieldName, docCountFormatted);
      } else if (fieldType === ML_JOB_FIELD_TYPES.KEYWORD) {
        await this.assertKeywordFieldContents(fieldName, docCountFormatted, exampleCount);
      } else if (fieldType === ML_JOB_FIELD_TYPES.TEXT) {
        await this.assertTextFieldContents(fieldName, docCountFormatted, exampleCount);
      } else if (fieldType === ML_JOB_FIELD_TYPES.GEO_POINT) {
        await this.assertGeoPointFieldContents(fieldName, docCountFormatted, exampleCount);
      } else if (fieldType === ML_JOB_FIELD_TYPES.UNKNOWN) {
        await this.assertUnknownFieldContents(fieldName, docCountFormatted);
      }
    }

    public async ensureNumRowsPerPage(n: 10 | 25 | 50) {
      const paginationButton = 'mlDataVisualizerTable > tablePaginationPopoverButton';
      await retry.tryForTime(10000, async () => {
        await testSubjects.existOrFail(paginationButton);
        await testSubjects.click(paginationButton);
        await testSubjects.click(`tablePagination-${n}-rows`);

        const visibleTexts = await testSubjects.getVisibleText(paginationButton);

        const [, pagination] = visibleTexts.split(': ');
        expect(pagination).to.eql(n.toString());
      });
    }
  })();
}
