/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { ML_JOB_FIELD_TYPES } from '@kbn/ml-plugin/common/constants/field_types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';
export type MlDataVisualizerTable = ProvidedType<typeof MachineLearningDataVisualizerTableProvider>;

export function MachineLearningDataVisualizerTableProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  return new (class DataVisualizerTable {
    public async parseDataVisualizerTable() {
      const table = await testSubjects.find('~dataVisualizerTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~dataVisualizerRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          type: $tr
            .findTestSubject('dataVisualizerTableColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          fieldName: $tr
            .findTestSubject('dataVisualizerTableColumnName')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          documentsCount: $tr
            .findTestSubject('dataVisualizerTableColumnDocumentsCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          distinctValues: $tr
            .findTestSubject('dataVisualizerTableColumnDistinctValues')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          distribution: $tr
            .findTestSubject('dataVisualizerTableColumnDistribution')
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
      const row = `~dataVisualizerTable > ~row-${fieldName}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async assertRowExists(fieldName: string) {
      await testSubjects.existOrFail(this.rowSelector(fieldName));
    }

    public async assertRowNotExists(fieldName: string) {
      await retry.tryForTime(1000, async () => {
        await testSubjects.missingOrFail(this.rowSelector(fieldName));
      });
    }

    public async assertDisplayName(fieldName: string, expectedDisplayName: string) {
      await retry.tryForTime(10000, async () => {
        const subj = await testSubjects.find(
          this.rowSelector(fieldName, `dataVisualizerDisplayName-${fieldName}`)
        );
        const displayName = await subj.getVisibleText();
        expect(displayName).to.eql(
          expectedDisplayName,
          `Expected display name of ${fieldName} to be '${expectedDisplayName}' (got '${displayName}')`
        );
      });
    }

    public detailsSelector(fieldName: string, subSelector?: string) {
      const row = `~dataVisualizerTable > ~dataVisualizerFieldExpandedRow-${fieldName}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureDetailsOpen(fieldName: string) {
      await retry.tryForTime(10000, async () => {
        if (!(await testSubjects.exists(this.detailsSelector(fieldName)))) {
          const selector = this.rowSelector(
            fieldName,
            `dataVisualizerDetailsToggle-${fieldName}-arrowRight`
          );
          await testSubjects.click(selector);
          await testSubjects.existOrFail(
            this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-arrowDown`),
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
            this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-arrowDown`)
          );
          await testSubjects.existOrFail(
            this.rowSelector(fieldName, `dataVisualizerDetailsToggle-${fieldName}-arrowRight`),
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
        'dataVisualizerTableColumnDocumentsCount'
      );
      await testSubjects.existOrFail(docCountFormattedSelector);
      const docCount = await testSubjects.getVisibleText(docCountFormattedSelector);
      expect(docCount).to.eql(
        docCountFormatted,
        `Expected field ${fieldName}'s document count to be '${docCountFormatted}' (got '${docCount}')`
      );
    }

    public async ensureAllMenuPopoversClosed() {
      await retry.tryForTime(5000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        const popoverExists = await find.existsByCssSelector('euiContextMenuPanel');
        expect(popoverExists).to.eql(false, 'All popovers should be closed');
      });
    }

    public async ensureActionsMenuOpen(fieldName: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.ensureAllMenuPopoversClosed();
        await testSubjects.click(this.rowSelector(fieldName, 'euiCollapsedItemActionsButton'));
        await find.existsByCssSelector('euiContextMenuPanel');
      });
    }

    public async assertActionsMenuClosed(fieldName: string, action: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.missingOrFail(action, { timeout: 5000 });
      });
    }

    public async assertActionMenuViewInLensEnabled(fieldName: string, expectedValue: boolean) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.ensureActionsMenuOpen(fieldName);
        const actionMenuViewInLensButton = await find.byCssSelector(
          '[data-test-subj="dataVisualizerActionViewInLensButton"][class="euiContextMenuItem"]'
        );
        const isEnabled = await actionMenuViewInLensButton.isEnabled();
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected "Explore in lens" action menu button for '${fieldName}' to be '${
            expectedValue ? 'enabled' : 'disabled'
          }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
        );
      });
    }

    public async assertActionMenuDeleteIndexPatternFieldButtonEnabled(
      fieldName: string,
      expectedValue: boolean
    ) {
      await this.ensureActionsMenuOpen(fieldName);
      const actionMenuViewInLensButton = await find.byCssSelector(
        '[data-test-subj="dataVisualizerActionDeleteIndexPatternFieldButton"][class="euiContextMenuItem"]'
      );
      const isEnabled = await actionMenuViewInLensButton.isEnabled();
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Delete index pattern field" action menu button for '${fieldName}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async clickActionMenuDeleteIndexPatternFieldButton(fieldName: string) {
      const testSubj = 'dataVisualizerActionDeleteIndexPatternFieldButton';
      await retry.tryForTime(5000, async () => {
        await this.ensureActionsMenuOpen(fieldName);

        const button = await find.byCssSelector(
          `[data-test-subj="${testSubj}"][class="euiContextMenuItem"]`
        );
        await button.click();
        await this.assertActionsMenuClosed(fieldName, testSubj);
        await testSubjects.existOrFail('runtimeFieldDeleteConfirmModal');
      });
    }

    public async assertViewInLensActionEnabled(fieldName: string, expectedValue: boolean) {
      const actionButton = this.rowSelector(fieldName, 'dataVisualizerActionViewInLensButton');
      await testSubjects.existOrFail(actionButton);
      const isEnabled = await testSubjects.isEnabled(actionButton);
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Explore in lens" button for '${fieldName}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertViewInLensActionNotExists(fieldName: string) {
      const actionButton = this.rowSelector(fieldName, 'dataVisualizerActionViewInLensButton');
      await testSubjects.missingOrFail(actionButton);
    }

    public async assertEditIndexPatternFieldButtonEnabled(
      fieldName: string,
      expectedValue: boolean
    ) {
      const selector = this.rowSelector(
        fieldName,
        'dataVisualizerActionEditIndexPatternFieldButton'
      );
      await testSubjects.existOrFail(selector);
      const isEnabled = await testSubjects.isEnabled(selector);
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Edit index pattern" button for '${fieldName}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async clickEditIndexPatternFieldButton(fieldName: string) {
      await retry.tryForTime(5000, async () => {
        await this.assertEditIndexPatternFieldButtonEnabled(fieldName, true);
        await testSubjects.click(
          this.rowSelector(fieldName, 'dataVisualizerActionEditIndexPatternFieldButton')
        );
        await testSubjects.existOrFail('indexPatternFieldEditorForm');
      });
    }

    public async assertFieldDistinctValuesExist(fieldName: string) {
      const selector = this.rowSelector(fieldName, 'dataVisualizerTableColumnDistinctValues');
      await testSubjects.existOrFail(selector);
    }

    public async assertFieldDistributionExist(fieldName: string) {
      const selector = this.rowSelector(fieldName, 'dataVisualizerTableColumnDistribution');
      await testSubjects.existOrFail(selector);
    }

    public async assertSearchPanelExist() {
      await testSubjects.existOrFail(`dataVisualizerSearchPanel`);
    }

    public async assertFieldNameInputExists() {
      await testSubjects.existOrFail('dataVisualizerFieldNameSelect');
    }

    public async assertFieldTypeInputExists() {
      await testSubjects.existOrFail('dataVisualizerFieldTypeSelect');
    }

    public async assertSampleSizeInputExists() {
      await testSubjects.existOrFail('dataVisualizerShardSizeSelect');
    }

    public async setSampleSizeInputValue(
      sampleSize: number | 'all',
      fieldName: string,
      docCountFormatted: string
    ) {
      await this.assertSampleSizeInputExists();
      await testSubjects.clickWhenNotDisabled('dataVisualizerShardSizeSelect');
      await testSubjects.existOrFail(`dataVisualizerShardSizeOption ${sampleSize}`);
      await testSubjects.click(`dataVisualizerShardSizeOption ${sampleSize}`);

      await retry.tryForTime(5000, async () => {
        await this.assertFieldDocCount(fieldName, docCountFormatted);
      });
    }

    public async setFieldTypeFilter(fieldTypes: string[], expectedRowCount = 1) {
      await this.assertFieldTypeInputExists();
      await mlCommonUI.setMultiSelectFilter('dataVisualizerFieldTypeSelect', fieldTypes);
      await this.assertTableRowCount(expectedRowCount);
    }

    async removeFieldTypeFilter(fieldTypes: string[], expectedRowCount = 1) {
      await this.assertFieldTypeInputExists();
      await mlCommonUI.removeMultiSelectFilter('dataVisualizerFieldTypeSelect', fieldTypes);
      await this.assertTableRowCount(expectedRowCount);
    }

    public async setFieldNameFilter(fieldNames: string[], expectedRowCount = 1) {
      await this.assertFieldNameInputExists();
      await mlCommonUI.setMultiSelectFilter('dataVisualizerFieldNameSelect', fieldNames);
      await this.assertTableRowCount(expectedRowCount);
    }

    public async removeFieldNameFilter(fieldNames: string[], expectedRowCount: number) {
      await this.assertFieldNameInputExists();
      await mlCommonUI.removeMultiSelectFilter('dataVisualizerFieldNameSelect', fieldNames);
      await this.assertTableRowCount(expectedRowCount);
    }

    public async assertShowEmptyFieldsSwitchExists() {
      await testSubjects.existOrFail('dataVisualizerShowEmptyFieldsSwitch');
    }

    public async assertShowEmptyFieldsCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('dataVisualizerShowEmptyFieldsSwitch', 'aria-checked')) ===
        'true';
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
          await testSubjects.click('dataVisualizerShowEmptyFieldsSwitch');
        }
        await this.assertShowEmptyFieldsCheckState(checkState);
        for (const field of expectedEmptyFields) {
          await this.assertRowExists(field);
        }
      });
    }

    public async assertTopValuesContent(fieldName: string, expectedTopValues: string[]) {
      const selector = this.detailsSelector(fieldName, 'dataVisualizerFieldDataTopValuesContent');
      const topValuesElement = await testSubjects.find(selector);
      const topValuesBars = await topValuesElement.findAllByTestSubject(
        'dataVisualizerFieldDataTopValueBar'
      );

      const topValuesBarsValues = await Promise.all(
        topValuesBars.map(async (bar) => {
          const visibleText = await bar.getVisibleText();
          return visibleText ? visibleText.split('\n')[0] : undefined;
        })
      );

      expect(topValuesBarsValues).to.eql(
        expectedTopValues,
        `Expected top values for field '${fieldName}' to equal '${expectedTopValues}' (got '${topValuesBarsValues}')`
      );
    }

    public async assertTopValuesCount(fieldName: string, expectedTopValuesCount: number) {
      const selector = this.detailsSelector(fieldName, 'dataVisualizerFieldDataTopValuesContent');
      const topValuesElement = await testSubjects.find(selector);
      const topValuesBars = await topValuesElement.findAllByTestSubject(
        'dataVisualizerFieldDataTopValueBar'
      );
      expect(topValuesBars).to.have.length(
        expectedTopValuesCount,
        `Expected top values count for field '${fieldName}' to be '${expectedTopValuesCount}' (got '${topValuesBars.length}')`
      );
    }

    public async assertDistributionPreviewExist(fieldName: string) {
      await testSubjects.existOrFail(
        this.rowSelector(fieldName, `dataVisualizerDataGridChart-${fieldName}`)
      );
      await testSubjects.existOrFail(
        this.rowSelector(fieldName, `dataVisualizerDataGridChart-${fieldName}-histogram`)
      );
    }

    public async assertNumberFieldContents(
      fieldName: string,
      docCountFormatted: string,
      topValuesCount: number,
      viewableInLens: boolean,
      hasActionMenu = false,
      checkDistributionPreviewExist = true
    ) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        this.detailsSelector(fieldName, 'dataVisualizerNumberSummaryTable')
      );

      await testSubjects.existOrFail(
        this.detailsSelector(fieldName, 'dataVisualizerFieldDataTopValues')
      );
      await this.assertTopValuesCount(fieldName, topValuesCount);

      if (checkDistributionPreviewExist) {
        await this.assertDistributionPreviewExist(fieldName);
      }
      if (viewableInLens) {
        if (hasActionMenu) {
          await this.assertActionMenuViewInLensEnabled(fieldName, true);
        } else {
          await this.assertViewInLensActionEnabled(fieldName, true);
        }
      } else {
        await this.assertViewInLensActionNotExists(fieldName);
      }

      await this.ensureDetailsClosed(fieldName);
    }

    public async assertDateFieldContents(fieldName: string, docCountFormatted: string) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        this.detailsSelector(fieldName, 'dataVisualizerDateSummaryTable')
      );
      await this.ensureDetailsClosed(fieldName);
    }

    public async assertKeywordFieldContents(
      fieldName: string,
      docCountFormatted: string,
      topValuesCount: number,
      exampleContent?: string[]
    ) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);
      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        this.detailsSelector(fieldName, 'dataVisualizerFieldDataTopValuesContent')
      );
      await this.assertTopValuesCount(fieldName, topValuesCount);

      if (exampleContent) {
        await this.assertTopValuesContent(fieldName, exampleContent);
      }
      await this.ensureDetailsClosed(fieldName);
    }

    public async assertExamplesList(fieldName: string, expectedExamplesCount: number) {
      const examplesList = await testSubjects.find(
        this.detailsSelector(fieldName, 'dataVisualizerFieldDataExamplesList')
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

      await testSubjects.existOrFail(
        this.detailsSelector(fieldName, 'dataVisualizerEmbeddedMapContent')
      );

      await this.ensureDetailsClosed(fieldName);
    }

    public async assertUnknownFieldContents(fieldName: string, docCountFormatted: string) {
      await this.assertRowExists(fieldName);
      await this.assertFieldDocCount(fieldName, docCountFormatted);

      await this.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        this.detailsSelector(fieldName, 'dataVisualizerDocumentStatsContent')
      );

      await this.ensureDetailsClosed(fieldName);
    }

    public async assertNonMetricFieldContents(
      fieldType: string,
      fieldName: string,
      docCountFormatted: string,
      exampleCount: number,
      viewableInLens: boolean,
      hasActionMenu?: boolean,
      exampleContent?: string[]
    ) {
      // Currently the data used in the data visualizer tests only contains these field types.
      if (fieldType === ML_JOB_FIELD_TYPES.DATE) {
        await this.assertDateFieldContents(fieldName, docCountFormatted);
      } else if (fieldType === ML_JOB_FIELD_TYPES.KEYWORD) {
        await this.assertKeywordFieldContents(
          fieldName,
          docCountFormatted,
          exampleCount,
          exampleContent
        );
      } else if (fieldType === ML_JOB_FIELD_TYPES.TEXT) {
        await this.assertTextFieldContents(fieldName, docCountFormatted, exampleCount);
      } else if (fieldType === ML_JOB_FIELD_TYPES.GEO_POINT) {
        await this.assertGeoPointFieldContents(fieldName, docCountFormatted, exampleCount);
      } else if (fieldType === ML_JOB_FIELD_TYPES.UNKNOWN) {
        await this.assertUnknownFieldContents(fieldName, docCountFormatted);
      }

      if (viewableInLens) {
        if (hasActionMenu) {
          await this.assertActionMenuViewInLensEnabled(fieldName, true);
        } else {
          await this.assertViewInLensActionEnabled(fieldName, true);
        }
      } else {
        await this.assertViewInLensActionNotExists(fieldName);
      }
    }

    public async assertLensActionShowChart(fieldName: string, visualizationContainer?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled(
          this.rowSelector(fieldName, 'dataVisualizerActionViewInLensButton')
        );
        await testSubjects.existOrFail(visualizationContainer ?? 'lnsVisualizationContainer', {
          timeout: 15 * 1000,
        });
      });
    }

    public async ensureNumRowsPerPage(n: 10 | 25 | 50) {
      const paginationButton = 'dataVisualizerTable > tablePaginationPopoverButton';
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
