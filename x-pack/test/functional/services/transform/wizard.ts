/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformWizardProvider({ getService, getPageObjects }: FtrProviderContext) {
  const aceEditor = getService('aceEditor');
  const canvasElement = getService('canvasElement');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'timePicker']);

  return {
    async clickNextButton() {
      await testSubjects.existOrFail('transformWizardNavButtonNext');
      await testSubjects.clickWhenNotDisabled('transformWizardNavButtonNext');
    },

    async assertDefineStepActive() {
      await testSubjects.existOrFail('transformStepDefineForm');
    },

    async assertDefineSummaryExists() {
      await testSubjects.existOrFail('transformStepDefineSummary');
    },

    async assertDetailsStepActive() {
      await testSubjects.existOrFail('transformStepDetailsForm');
    },

    async assertDetailsSummaryExists() {
      await testSubjects.existOrFail('transformStepDetailsSummary');
    },

    async assertCreateStepActive() {
      await testSubjects.existOrFail('transformStepCreateForm');
    },

    async advanceToDetailsStep() {
      await this.clickNextButton();
      await this.assertDetailsStepActive();
      await this.assertDefineSummaryExists();
    },

    async advanceToCreateStep() {
      await this.clickNextButton();
      await this.assertCreateStepActive();
      await this.assertDefineSummaryExists();
      await this.assertDetailsSummaryExists();
    },

    async assertIndexPreviewExists(subSelector?: string) {
      let selector = 'transformIndexPreview';
      if (subSelector !== undefined) {
        selector = `${selector} ${subSelector}`;
      } else {
        selector = `~${selector}`;
      }
      await testSubjects.existOrFail(selector);
    },

    async assertIndexPreviewLoaded() {
      await this.assertIndexPreviewExists('loaded');
    },

    async assertPivotPreviewExists(subSelector?: string) {
      let selector = 'transformPivotPreview';
      if (subSelector !== undefined) {
        selector = `${selector} ${subSelector}`;
      } else {
        selector = `~${selector}`;
      }
      await testSubjects.existOrFail(selector);
    },

    async assertPivotPreviewChartHistogramButtonMissing() {
      // the button should not exist because histogram charts
      // for the pivot preview are not supported yet
      await testSubjects.missingOrFail('transformPivotPreviewHistogramButton');
    },

    async parseEuiDataGrid(tableSubj: string) {
      const table = await testSubjects.find(`~${tableSubj}`);
      const $ = await table.parseDomContent();

      // find columns to help determine number of rows
      const columns = $('.euiDataGridHeaderCell__content')
        .toArray()
        .map((cell) => $(cell).text());

      // Get the content of each cell and divide them up into rows
      const cells = $.findTestSubjects('dataGridRowCell')
        .find('.euiDataGridRowCell__truncate')
        .toArray()
        .map((cell) =>
          $(cell)
            .text()
            .trim()
            .replace(/Row: \d+, Column: \d+:$/g, '')
        );

      const rows = chunk(cells, columns.length);

      return rows;
    },

    async assertEuiDataGridColumnValues(
      tableSubj: string,
      column: number,
      expectedColumnValues: string[]
    ) {
      await retry.tryForTime(2000, async () => {
        // get a 2D array of rows and cell values
        const rows = await this.parseEuiDataGrid(tableSubj);

        // reduce the rows data to an array of unique values in the specified column
        const uniqueColumnValues = rows
          .map((row) => row[column])
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);

        uniqueColumnValues.sort();

        // check if the returned unique value matches the supplied filter value
        expect(uniqueColumnValues).to.eql(
          expectedColumnValues,
          `Unique EuiDataGrid column values should be '${expectedColumnValues.join()}' (got ${uniqueColumnValues.join()})`
        );
      });
    },

    async assertEuiDataGridColumnValuesNotEmpty(tableSubj: string, column: number) {
      await retry.tryForTime(2000, async () => {
        // get a 2D array of rows and cell values
        const rows = await this.parseEuiDataGrid(tableSubj);

        // reduce the rows data to an array of unique values in the specified column
        const uniqueColumnValues = rows
          .map((row) => row[column])
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);

        uniqueColumnValues.forEach((value) => {
          // check if the returned unique value is not empty
          expect(value).to.not.eql('');
        });
      });
    },

    async assertIndexPreview(columns: number, expectedNumberOfRows: number) {
      await retry.tryForTime(2000, async () => {
        // get a 2D array of rows and cell values
        const rowsData = await this.parseEuiDataGrid('transformIndexPreview');

        expect(rowsData).to.length(
          expectedNumberOfRows,
          `EuiDataGrid rows should be '${expectedNumberOfRows}' (got '${rowsData.length}')`
        );

        // cell virtualization means the last column is cutoff in the functional tests
        // https://github.com/elastic/eui/issues/4470
        // rowsData.map((r, i) =>
        //   expect(r).to.length(
        //     columns,
        //     `EuiDataGrid row #${i + 1} column count should be '${columns}' (got '${r.length}')`
        //   )
        // );
      });
    },

    async assertIndexPreviewColumnValues(column: number, values: string[]) {
      await this.assertEuiDataGridColumnValues('transformIndexPreview', column, values);
    },

    async assertIndexPreviewColumnValuesNotEmpty(column: number) {
      await this.assertEuiDataGridColumnValuesNotEmpty('transformIndexPreview', column);
    },

    async assertPivotPreviewColumnValues(column: number, values: string[]) {
      await this.assertEuiDataGridColumnValues('transformPivotPreview', column, values);
    },

    async assertPivotPreviewColumnValuesNotEmpty(column: number) {
      await this.assertEuiDataGridColumnValuesNotEmpty('transformPivotPreview', column);
    },

    async assertPivotPreviewLoaded() {
      await this.assertPivotPreviewExists('loaded');
    },

    async assertTransformPreviewEmpty() {
      await this.assertPivotPreviewExists('empty');
    },

    async assertIndexPreviewHistogramChartButtonExists() {
      await testSubjects.existOrFail('transformIndexPreviewHistogramButton');
    },

    async enableIndexPreviewHistogramCharts(expectedDefaultButtonState: boolean) {
      await this.assertIndexPreviewHistogramChartButtonCheckState(expectedDefaultButtonState);
      if (expectedDefaultButtonState === false) {
        await testSubjects.click('transformIndexPreviewHistogramButton');
        await this.assertIndexPreviewHistogramChartButtonCheckState(true);
      }
    },

    async assertIndexPreviewHistogramChartButtonCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'transformIndexPreviewHistogramButton',
          'aria-pressed'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Chart histogram button check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertIndexPreviewHistogramCharts(
      expectedHistogramCharts: Array<{
        chartAvailable: boolean;
        id: string;
        legend?: string;
        colorStats?: any[];
      }>
    ) {
      // For each chart, get the content of each header cell and assert
      // the legend text and column id and if the chart should be present or not.
      await retry.tryForTime(5000, async () => {
        for (const expected of expectedHistogramCharts.values()) {
          const id = expected.id;
          await testSubjects.existOrFail(`mlDataGridChart-${id}`);

          if (expected.chartAvailable) {
            await testSubjects.existOrFail(`mlDataGridChart-${id}-histogram`);

            if (expected.colorStats !== undefined) {
              const sortedExpectedColorStats = [...expected.colorStats].sort((a, b) =>
                a.key.localeCompare(b.key)
              );

              const actualColorStats = await canvasElement.getColorStats(
                `[data-test-subj="mlDataGridChart-${id}-histogram"] .echCanvasRenderer`,
                sortedExpectedColorStats
              );

              expect(actualColorStats.length).to.eql(
                sortedExpectedColorStats.length,
                `Expected and actual color stats for column '${expected.id}' should have the same amount of elements. Expected: ${sortedExpectedColorStats.length} (got ${actualColorStats.length})`
              );
              expect(actualColorStats.every((d) => d.withinTolerance)).to.eql(
                true,
                `Color stats for column '${
                  expected.id
                }' should be within tolerance. Expected: '${JSON.stringify(
                  sortedExpectedColorStats
                )}' (got '${JSON.stringify(actualColorStats)}')`
              );
            }
          } else {
            await testSubjects.missingOrFail(`mlDataGridChart-${id}-histogram`);
          }

          if (expected.legend !== undefined) {
            const actualLegend = await testSubjects.getVisibleText(`mlDataGridChart-${id}-legend`);
            expect(actualLegend).to.eql(
              expected.legend,
              `Legend text for column '${expected.id}' should be '${expected.legend}' (got '${actualLegend}')`
            );
          }

          const actualId = await testSubjects.getVisibleText(`mlDataGridChart-${id}-id`);
          expect(actualId).to.eql(
            expected.id,
            `Id text for column '${id}' should be '${expected.id}' (got '${actualId}')`
          );
        }
      });
    },

    async assertQueryInputExists() {
      await testSubjects.existOrFail('transformQueryInput');
    },

    async assertQueryInputMissing() {
      await testSubjects.missingOrFail('transformQueryInput');
    },

    async assertQueryValue(expectedQuery: string) {
      const actualQuery = await testSubjects.getVisibleText('transformQueryInput');
      expect(actualQuery).to.eql(
        expectedQuery,
        `Query input text should be '${expectedQuery}' (got ${actualQuery})`
      );
    },

    async assertAdvancedQueryEditorSwitchExists() {
      await testSubjects.existOrFail(`transformAdvancedQueryEditorSwitch`, { allowHidden: true });
    },

    async assertAdvancedQueryEditorSwitchMissing() {
      await testSubjects.missingOrFail(`transformAdvancedQueryEditorSwitch`);
    },

    async assertAdvancedQueryEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformAdvancedQueryEditorSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced query editor switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertRuntimeMappingsEditorSwitchExists() {
      await testSubjects.existOrFail(`transformAdvancedRuntimeMappingsEditorSwitch`);
    },

    async assertRuntimeMappingsEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getRuntimeMappingsEditorSwitchCheckedState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced runtime mappings editor switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async getRuntimeMappingsEditorSwitchCheckedState(): Promise<boolean> {
      const subj = 'transformAdvancedRuntimeMappingsEditorSwitch';
      const isSelected = await testSubjects.getAttribute(subj, 'aria-checked');
      return isSelected === 'true';
    },

    async toggleRuntimeMappingsEditorSwitch(toggle: boolean) {
      const subj = 'transformAdvancedRuntimeMappingsEditorSwitch';
      if ((await this.getRuntimeMappingsEditorSwitchCheckedState()) !== toggle) {
        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.clickWhenNotDisabled(subj);
          await this.assertRuntimeMappingsEditorSwitchCheckState(toggle);
        });
      }
    },

    async assertRuntimeMappingsEditorExists() {
      await testSubjects.existOrFail('transformAdvancedRuntimeMappingsEditor');
    },

    async assertRuntimeMappingsEditorMissing() {
      await testSubjects.missingOrFail('transformAdvancedRuntimeMappingsEditor');
    },

    async assertRuntimeMappingsEditorContent(expectedContent: string[]) {
      await this.assertRuntimeMappingsEditorExists();

      const runtimeMappingsEditorString = await aceEditor.getValue(
        'transformAdvancedRuntimeMappingsEditor'
      );
      // Not all lines may be visible in the editor and thus aceEditor may not return all lines.
      // This means we might not get back valid JSON so we only test against the first few lines
      // and see if the string matches.
      const splicedAdvancedEditorValue = runtimeMappingsEditorString.split('\n').splice(0, 3);
      expect(splicedAdvancedEditorValue).to.eql(
        expectedContent,
        `Expected the first editor lines to be '${expectedContent}' (got '${splicedAdvancedEditorValue}')`
      );
    },

    async setRuntimeMappingsEditorContent(input: string) {
      await this.assertRuntimeMappingsEditorExists();
      await aceEditor.setValue('transformAdvancedRuntimeMappingsEditor', input);
    },

    async applyRuntimeMappings() {
      const subj = 'transformRuntimeMappingsApplyButton';
      await testSubjects.existOrFail(subj);
      await testSubjects.clickWhenNotDisabled(subj);
      const isEnabled = await testSubjects.isEnabled(subj);
      expect(isEnabled).to.eql(
        false,
        `Expected runtime mappings 'Apply changes' button to be disabled, got enabled.`
      );
    },

    async assertSelectedTransformFunction(transformFunction: 'pivot' | 'latest') {
      await testSubjects.existOrFail(
        `transformCreation-${transformFunction}-option selectedFunction`
      );
    },

    async selectTransformFunction(transformFunction: 'pivot' | 'latest') {
      await testSubjects.click(`transformCreation-${transformFunction}-option`);
      await this.assertSelectedTransformFunction(transformFunction);
    },

    async assertUniqueKeysInputExists() {
      await testSubjects.existOrFail('transformWizardUniqueKeysSelector > comboBoxInput');
    },

    async getUniqueKeyEntries() {
      return await comboBox.getComboBoxSelectedOptions(
        'transformWizardUniqueKeysSelector > comboBoxInput'
      );
    },

    async assertUniqueKeysInputValue(expectedIdentifier: string[]) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await this.getUniqueKeyEntries();
        expect(comboBoxSelectedOptions).to.eql(
          expectedIdentifier,
          `Expected unique keys value to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
        );
      });
    },

    async addUniqueKeyEntry(identified: string, label: string) {
      await comboBox.set('transformWizardUniqueKeysSelector > comboBoxInput', identified);
      await this.assertUniqueKeysInputValue([
        ...new Set([...(await this.getUniqueKeyEntries()), identified]),
      ]);
    },

    async assertSortFieldInputExists() {
      await testSubjects.existOrFail('transformWizardSortFieldSelector > comboBoxInput');
    },

    async assertSortFieldInputValue(expectedIdentifier: string) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'transformWizardSortFieldSelector > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(
          expectedIdentifier === '' ? [] : [expectedIdentifier],
          `Expected sort field to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
        );
      });
    },

    async setSortFieldValue(identificator: string, label: string) {
      await comboBox.set('transformWizardSortFieldSelector > comboBoxInput', identificator);
      await this.assertSortFieldInputValue(identificator);
    },

    async assertGroupByInputExists() {
      await testSubjects.existOrFail('transformGroupBySelection > comboBoxInput');
    },

    async assertGroupByInputValue(expectedIdentifier: string[]) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'transformGroupBySelection > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(
          expectedIdentifier,
          `Expected group by value to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
        );
      });
    },

    async assertGroupByEntryExists(
      index: number,
      expectedLabel: string,
      expectedIntervalLabel?: string
    ) {
      await testSubjects.existOrFail(`transformGroupByEntry ${index}`);

      const actualLabel = await testSubjects.getVisibleText(
        `transformGroupByEntry ${index} > transformGroupByEntryLabel`
      );
      expect(actualLabel).to.eql(
        expectedLabel,
        `Label for group by entry '${index}' should be '${expectedLabel}' (got '${actualLabel}')`
      );

      if (expectedIntervalLabel !== undefined) {
        const actualIntervalLabel = await testSubjects.getVisibleText(
          `transformGroupByEntry ${index} > transformGroupByEntryIntervalLabel`
        );
        expect(actualIntervalLabel).to.eql(
          expectedIntervalLabel,
          `Label for group by entry '${index}' should be '${expectedIntervalLabel}' (got '${actualIntervalLabel}')`
        );
      }
    },

    async addGroupByEntry(
      index: number,
      identifier: string,
      expectedLabel: string,
      expectedIntervalLabel?: string
    ) {
      await comboBox.set('transformGroupBySelection > comboBoxInput', identifier);
      await this.assertGroupByInputValue([]);
      await this.assertGroupByEntryExists(index, expectedLabel, expectedIntervalLabel);
    },

    getAggComboBoxInputSelector(parentSelector = ''): string {
      return `${parentSelector && `${parentSelector} > `}${
        parentSelector ? 'transformSubAggregationSelection' : 'transformAggregationSelection'
      } > comboBoxInput`;
    },

    async assertAggregationInputExists(parentSelector?: string) {
      await testSubjects.existOrFail(this.getAggComboBoxInputSelector(parentSelector));
    },

    async assertAggregationInputValue(expectedIdentifier: string[], parentSelector?: string) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          this.getAggComboBoxInputSelector(parentSelector)
        );
        expect(comboBoxSelectedOptions).to.eql(
          expectedIdentifier,
          `Expected aggregation value to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
        );
      });
    },

    async assertAggregationEntryExists(index: number, expectedLabel: string, parentSelector = '') {
      const aggEntryPanelSelector = `${
        parentSelector && `${parentSelector} > `
      }transformAggregationEntry_${index}`;
      await testSubjects.existOrFail(aggEntryPanelSelector);

      const actualLabel = await testSubjects.getVisibleText(
        `${aggEntryPanelSelector} > transformAggregationEntryLabel`
      );
      expect(actualLabel).to.eql(
        expectedLabel,
        `Label for aggregation entry '${index}' should be '${expectedLabel}' (got '${actualLabel}')`
      );
    },

    async addAggregationEntries(aggregationEntries: any[], parentSelector?: string) {
      for (const [index, agg] of aggregationEntries.entries()) {
        await this.assertAggregationInputExists(parentSelector);
        await this.assertAggregationInputValue([], parentSelector);
        await this.addAggregationEntry(index, agg.identifier, agg.label, agg.form, parentSelector);

        if (agg.subAggs) {
          await this.addAggregationEntries(
            agg.subAggs,
            `${parentSelector ? `${parentSelector} > ` : ''}transformAggregationEntry_${index}`
          );
        }
      }
    },

    async addAggregationEntry(
      index: number,
      identifier: string,
      expectedLabel: string,
      formData?: Record<string, any>,
      parentSelector = ''
    ) {
      await comboBox.set(this.getAggComboBoxInputSelector(parentSelector), identifier);
      await this.assertAggregationInputValue([], parentSelector);
      await this.assertAggregationEntryExists(index, expectedLabel, parentSelector);

      if (formData !== undefined) {
        await this.fillPopoverForm(identifier, expectedLabel, formData);
      }
    },

    async fillPopoverForm(
      identifier: string,
      expectedLabel: string,
      formData: Record<string, any>
    ) {
      await testSubjects.existOrFail(`transformAggPopoverForm_${expectedLabel}`);

      for (const [testObj, value] of Object.entries(formData)) {
        switch (testObj) {
          case 'transformFilterAggTypeSelector':
            await this.selectFilerAggType(value);
            break;
          case 'transformFilterTermValueSelector':
            await this.fillFilterTermValue(value);
            break;
        }
      }
      await testSubjects.clickWhenNotDisabled('transformApplyAggChanges');
      await testSubjects.missingOrFail(`transformAggPopoverForm_${expectedLabel}`);
    },

    async selectFilerAggType(value: string) {
      await testSubjects.selectValue('transformFilterAggTypeSelector', value);
    },

    async fillFilterTermValue(value: string) {
      await comboBox.set('transformFilterTermValueSelector', value);
    },

    async assertAdvancedPivotEditorContent(expectedValue: string[]) {
      const advancedEditorString = await aceEditor.getValue('transformAdvancedPivotEditor');
      // Not all lines may be visible in the editor and thus aceEditor may not return all lines.
      // This means we might not get back valid JSON so we only test against the first few lines
      // and see if the string matches.

      // const advancedEditorValue = JSON.parse(advancedEditorString);
      // expect(advancedEditorValue).to.eql(expectedValue);
      const splicedAdvancedEditorValue = advancedEditorString.split('\n').splice(0, 3);
      expect(splicedAdvancedEditorValue).to.eql(
        expectedValue,
        `Expected the first editor lines to be '${expectedValue}' (got '${splicedAdvancedEditorValue}')`
      );
    },

    async assertAdvancedPivotEditorSwitchExists() {
      await testSubjects.existOrFail(`transformAdvancedPivotEditorSwitch`, { allowHidden: true });
    },

    async assertAdvancedPivotEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformAdvancedPivotEditorSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced pivot editor switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async enableAdvancedPivotEditor() {
      await this.assertAdvancedPivotEditorSwitchCheckState(false);
      await testSubjects.click('transformAdvancedPivotEditorSwitch');
      await this.assertAdvancedPivotEditorSwitchCheckState(true);
      await testSubjects.existOrFail('transformAdvancedPivotEditor');
    },

    async assertTransformIdInputExists() {
      await testSubjects.existOrFail('transformIdInput');
    },

    async assertTransformIdValue(expectedValue: string) {
      const actualTransformId = await testSubjects.getAttribute('transformIdInput', 'value');
      expect(actualTransformId).to.eql(
        expectedValue,
        `Transform id input text should be '${expectedValue}' (got '${actualTransformId}')`
      );
    },

    async setTransformId(transformId: string) {
      await testSubjects.setValue('transformIdInput', transformId, { clearWithKeyboard: true });
      await this.assertTransformIdValue(transformId);
    },

    async assertTransformDescriptionInputExists() {
      await testSubjects.existOrFail('transformDescriptionInput');
    },

    async assertTransformDescriptionValue(expectedValue: string) {
      const actualTransformDescription = await testSubjects.getAttribute(
        'transformDescriptionInput',
        'value'
      );
      expect(actualTransformDescription).to.eql(
        expectedValue,
        `Transform description input text should be '${expectedValue}' (got '${actualTransformDescription}')`
      );
    },

    async setTransformDescription(transformDescription: string) {
      await testSubjects.setValue('transformDescriptionInput', transformDescription, {
        clearWithKeyboard: true,
      });
      await this.assertTransformDescriptionValue(transformDescription);
    },

    async assertDestinationIndexInputExists() {
      await testSubjects.existOrFail('transformDestinationIndexInput');
    },

    async assertDestinationIndexValue(expectedValue: string) {
      const actualDestinationIndex = await testSubjects.getAttribute(
        'transformDestinationIndexInput',
        'value'
      );
      expect(actualDestinationIndex).to.eql(
        expectedValue,
        `Destination index input text should be '${expectedValue}' (got '${actualDestinationIndex}')`
      );
    },

    async setDestinationIndex(destinationIndex: string) {
      await testSubjects.setValue('transformDestinationIndexInput', destinationIndex, {
        clearWithKeyboard: true,
      });
      await this.assertDestinationIndexValue(destinationIndex);
    },

    async assertCreateIndexPatternSwitchExists() {
      await testSubjects.existOrFail(`transformCreateIndexPatternSwitch`, { allowHidden: true });
    },

    async assertCreateIndexPatternSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformCreateIndexPatternSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Create index pattern switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertContinuousModeSwitchExists() {
      await testSubjects.existOrFail(`transformContinuousModeSwitch`, { allowHidden: true });
    },

    async assertContinuousModeSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformContinuousModeSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Continuous mode switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertTransformAdvancedSettingsAccordionExists() {
      await testSubjects.existOrFail('transformWizardAccordionAdvancedSettings');
    },

    // for now we expect this to be used only for opening the accordion
    async openTransformAdvancedSettingsAccordion() {
      await this.assertTransformAdvancedSettingsAccordionExists();
      await testSubjects.click('transformWizardAccordionAdvancedSettings');
      await this.assertTransformFrequencyInputExists();
      await this.assertTransformMaxPageSearchSizeInputExists();
    },

    async assertTransformFrequencyInputExists() {
      await testSubjects.existOrFail('transformFrequencyInput');
      expect(await testSubjects.isDisplayed('transformFrequencyInput')).to.eql(
        true,
        `Expected 'Frequency' input to be displayed`
      );
    },

    async assertTransformFrequencyValue(expectedValue: string) {
      const actualValue = await testSubjects.getAttribute('transformFrequencyInput', 'value');
      expect(actualValue).to.eql(
        expectedValue,
        `Transform frequency input text should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertTransformMaxPageSearchSizeInputExists() {
      await testSubjects.existOrFail('transformMaxPageSearchSizeInput');
      expect(await testSubjects.isDisplayed('transformMaxPageSearchSizeInput')).to.eql(
        true,
        `Expected 'Maximum page search size' input to be displayed`
      );
    },

    async assertTransformMaxPageSearchSizeValue(expectedValue: number) {
      const actualValue = await testSubjects.getAttribute(
        'transformMaxPageSearchSizeInput',
        'value'
      );
      expect(actualValue).to.eql(
        expectedValue,
        `Transform maximum page search size input text should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertCreateAndStartButtonExists() {
      await testSubjects.existOrFail('transformWizardCreateAndStartButton');
      expect(await testSubjects.isDisplayed('transformWizardCreateAndStartButton')).to.eql(
        true,
        `Expected 'Create and start' button to be displayed`
      );
    },

    async assertCreateAndStartButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('transformWizardCreateAndStartButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected 'Create and start' button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertCreateButtonExists() {
      await testSubjects.existOrFail('transformWizardCreateButton');
      expect(await testSubjects.isDisplayed('transformWizardCreateButton')).to.eql(
        true,
        `Expected 'Create' button to be displayed`
      );
    },

    async assertCreateButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('transformWizardCreateButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected 'Create' button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertCopyToClipboardButtonExists() {
      await testSubjects.existOrFail('transformWizardCopyToClipboardButton');
      expect(await testSubjects.isDisplayed('transformWizardCopyToClipboardButton')).to.eql(
        true,
        `Expected 'Copy to clipboard' button to be displayed`
      );
    },

    async assertCopyToClipboardButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('transformWizardCopyToClipboardButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected 'Copy to clipboard' button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertStartButtonExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('transformWizardStartButton');
        expect(await testSubjects.isDisplayed('transformWizardStartButton')).to.eql(
          true,
          `Expected 'Start' button to be displayed`
        );
      });
    },

    async assertStartButtonEnabled(expectedValue: boolean) {
      await retry.tryForTime(5000, async () => {
        const isEnabled = await testSubjects.isEnabled('transformWizardStartButton');
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected 'Start' button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
            isEnabled ? 'enabled' : 'disabled'
          }')`
        );
      });
    },

    async assertManagementCardExists() {
      await testSubjects.existOrFail(`transformWizardCardManagement`);
    },

    async returnToManagement() {
      await testSubjects.click('transformWizardCardManagement');
      await testSubjects.existOrFail('transformPageTransformList');
    },

    async assertDiscoverCardExists() {
      await testSubjects.existOrFail(`transformWizardCardDiscover`);
    },

    async redirectToDiscover() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.click('transformWizardCardDiscover');
        await PageObjects.discover.isDiscoverAppOnScreen();
      });
    },

    async setDiscoverTimeRange(fromTime: string, toTime: string) {
      await PageObjects.discover.isDiscoverAppOnScreen();
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    },

    async assertDiscoverContainField(field: string) {
      await PageObjects.discover.isDiscoverAppOnScreen();
      await retry.tryForTime(60 * 1000, async () => {
        const allFields = await PageObjects.discover.getAllFieldNames();
        if (Array.isArray(allFields)) {
          // For some reasons, Discover returns fields with dot (e.g '.avg') with extra space
          const fields = allFields.map((n) => n.replace('.​', '.'));
          expect(fields).to.contain(
            field,
            `Expected Discover to contain field ${field}, got ${allFields.join()}`
          );
        }
      });
    },

    async assertProgressbarExists() {
      await testSubjects.existOrFail(`transformWizardProgressBar`);
    },

    async waitForProgressBarComplete() {
      await retry.tryForTime(60 * 1000, async () => {
        const actualValue = await testSubjects.getAttribute('transformWizardProgressBar', 'value');
        if (actualValue === '100') {
          return true;
        } else {
          throw new Error(`Expected progress bar value to be 100 (got ${actualValue})`);
        }
      });
    },

    async createTransform() {
      await testSubjects.click('transformWizardCreateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertStartButtonExists();
        await this.assertStartButtonEnabled(true);
        await this.assertManagementCardExists();
        await this.assertCreateButtonEnabled(false);
      });
    },

    async startTransform() {
      await testSubjects.click('transformWizardStartButton');
      await retry.tryForTime(5000, async () => {
        await this.assertDiscoverCardExists();
        await this.assertStartButtonEnabled(false);
        await this.assertProgressbarExists();
      });
    },
  };
}
