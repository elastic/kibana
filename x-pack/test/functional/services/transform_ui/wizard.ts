/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformWizardProvider({ getService }: FtrProviderContext) {
  const aceEditor = getService('aceEditor');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');

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

    async parseEuiDataGrid(tableSubj: string) {
      const table = await testSubjects.find(`~${tableSubj}`);
      const $ = await table.parseDomContent();
      const rows = [];

      // For each row, get the content of each cell and
      // add its values as an array to each row.
      for (const tr of $.findTestSubjects(`~dataGridRow`).toArray()) {
        rows.push(
          $(tr)
            .find('.euiDataGridRowCell__truncate')
            .toArray()
            .map(cell =>
              $(cell)
                .text()
                .trim()
            )
        );
      }

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
          .map(row => row[column])
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

    async assertIndexPreview(columns: number, rows: number) {
      await retry.tryForTime(2000, async () => {
        // get a 2D array of rows and cell values
        const rowsData = await this.parseEuiDataGrid('transformIndexPreview');

        expect(rowsData).to.length(
          rows,
          `EuiDataGrid rows should be ${rows} (got ${rowsData.length})`
        );

        rowsData.map((r, i) =>
          expect(r).to.length(
            columns,
            `EuiDataGrid row #${i + 1} column count should be ${columns} (got ${r.length})`
          )
        );
      });
    },

    async assertIndexPreviewColumnValues(column: number, values: string[]) {
      await this.assertEuiDataGridColumnValues('transformIndexPreview', column, values);
    },

    async assertPivotPreviewColumnValues(column: number, values: string[]) {
      await this.assertEuiDataGridColumnValues('transformPivotPreview', column, values);
    },

    async assertPivotPreviewLoaded() {
      await this.assertPivotPreviewExists('loaded');
    },

    async assertPivotPreviewEmpty() {
      await this.assertPivotPreviewExists('empty');
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
        `Advanced query editor switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertGroupByInputExists() {
      await testSubjects.existOrFail('transformGroupBySelection > comboBoxInput');
    },

    async assertGroupByInputValue(expectedIdentifier: string[]) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'transformGroupBySelection > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
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
        `Label for group by entry ${index} should be '${expectedLabel}' (got '${actualLabel}')`
      );

      if (expectedIntervalLabel !== undefined) {
        const actualIntervalLabel = await testSubjects.getVisibleText(
          `transformGroupByEntry ${index} > transformGroupByEntryIntervalLabel`
        );
        expect(actualIntervalLabel).to.eql(
          expectedIntervalLabel,
          `Label for group by entry ${index} should be '${expectedIntervalLabel}' (got '${actualIntervalLabel}')`
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

    async assertAggregationInputExists() {
      await testSubjects.existOrFail('transformAggregationSelection > comboBoxInput');
    },

    async assertAggregationInputValue(expectedIdentifier: string[]) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'transformAggregationSelection > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
      });
    },

    async assertAggregationEntryExists(index: number, expectedLabel: string) {
      await testSubjects.existOrFail(`transformAggregationEntry ${index}`);

      const actualLabel = await testSubjects.getVisibleText(
        `transformAggregationEntry ${index} > transformAggregationEntryLabel`
      );
      expect(actualLabel).to.eql(
        expectedLabel,
        `Label for aggregation entry ${index} should be '${expectedLabel}' (got '${actualLabel}')`
      );
    },

    async addAggregationEntry(index: number, identifier: string, expectedLabel: string) {
      await comboBox.set('transformAggregationSelection > comboBoxInput', identifier);
      await this.assertAggregationInputValue([]);
      await this.assertAggregationEntryExists(index, expectedLabel);
    },

    async assertAdvancedPivotEditorContent(expectedValue: Record<string, any>) {
      const advancedEditorString = await aceEditor.getValue('transformAdvancedPivotEditor');
      const advancedEditorValue = JSON.parse(advancedEditorString);
      expect(advancedEditorValue).to.eql(expectedValue);
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
        `Advanced pivot editor switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async enabledAdvancedPivotEditor() {
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
        `Transform id input text should be ${expectedValue} (got ${actualTransformId})`
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
        `Transform description input text should be ${expectedValue} (got ${actualTransformDescription})`
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
        `Destination index input text should be ${expectedValue} (got ${actualDestinationIndex})`
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
        `Create index pattern switch check state should be ${expectedCheckState} (got ${actualCheckState})`
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
        `Continuous mode switch check state should be ${expectedCheckState} (got ${actualCheckState})`
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
        }' (got ${isEnabled ? 'enabled' : 'disabled'}')`
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
        `Expected 'Create' button to be '${expectedValue ? 'enabled' : 'disabled'}' (got ${
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
        }' (got ${isEnabled ? 'enabled' : 'disabled'}')`
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
          `Expected 'Start' button to be '${expectedValue ? 'enabled' : 'disabled'}' (got ${
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
