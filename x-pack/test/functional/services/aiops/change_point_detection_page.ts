/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlTableService } from '../ml/common_table_service';

export interface DashboardAttachmentOptions {
  applyTimeRange: boolean;
  maxSeries: number;
}

export function ChangePointDetectionPageProvider(
  { getService, getPageObject }: FtrProviderContext,
  tableService: MlTableService
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const dashboardPage = getPageObject('dashboard');

  return {
    async navigateToDataViewSelection() {
      await testSubjects.click('mlMainTab changePointDetection');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async assertChangePointDetectionPageExists() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('aiopsChangePointDetectionPage');
      });
    },

    async assertQueryInput(expectedQueryString: string) {
      const aiopsQueryInput = await testSubjects.find('aiopsQueryInput');
      const actualQueryString = await aiopsQueryInput.getVisibleText();
      expect(actualQueryString).to.eql(
        expectedQueryString,
        `Expected query bar text to be '${expectedQueryString}' (got '${actualQueryString}')`
      );
    },

    async assertPanelLoaded() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.waitForHidden('aiopsChangePointResultsTable loading');
      });
    },

    async assertMetricFieldSelection(panelIndex: number = 0, expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        `aiopsChangePointPanel_${panelIndex} > aiopsChangePointMetricField > comboBoxInput`
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected a metric field to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectMetricField(panelIndex: number = 0, value: string) {
      await comboBox.set(
        `aiopsChangePointPanel_${panelIndex} > aiopsChangePointMetricField > comboBoxInput`,
        value
      );
      await this.assertMetricFieldSelection(panelIndex, [value]);
    },

    async assertSplitFieldSelection(panelIndex: number = 0, expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        `aiopsChangePointPanel_${panelIndex} > aiopsChangePointSplitField > comboBoxInput`
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected a split field to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectSplitField(panelIndex: number = 0, value: string) {
      await comboBox.set(
        `aiopsChangePointPanel_${panelIndex} > aiopsChangePointSplitField > comboBoxInput`,
        value
      );
      await this.assertSplitFieldSelection(panelIndex, [value]);
    },

    async clickUseFullDataButton() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry('mlDatePickerButtonUseFullData');
        await testSubjects.clickWhenNotDisabledWithoutRetry('superDatePickerApplyTimeButton');
        await testSubjects.existOrFail('aiopsChangePointResultsTable loaded');
      });
    },

    async viewSelected() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry(
          'aiopsChangePointDetectionViewSelected'
        );
        await testSubjects.existOrFail('aiopsChangePointDetectionSelectedCharts');
      });
    },

    async assertDetailedView(expectedChartCount: number) {
      const testSubj = 'aiopsChangePointDetectionSelectedCharts > xyVisChart';
      await elasticChart.waitForRenderComplete(testSubj);
      const changePointCharts = await testSubjects.findAll(testSubj);
      expect(changePointCharts.length).to.eql(
        expectedChartCount,
        `Expected ${expectedChartCount} charts in the flyout (got '${changePointCharts.length}')`
      );
    },

    async closeFlyout() {
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.missingOrFail('aiopsChangePointDetectionSelectedCharts');
    },

    async addChangePointConfig() {
      await testSubjects.click('aiopsChangePointAddConfig');
    },

    async assertPanelExist(index: number) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail(`aiopsChangePointPanel_${index}`);
      });
    },

    async openPanelContextMenu(panelIndex: number) {
      await testSubjects.click(
        `aiopsChangePointPanel_${panelIndex} > aiopsChangePointDetectionContextMenuButton`
      );
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail(`aiopsChangePointDetectionAttachButton`);
      });
    },

    async clickAttachChartsButton() {
      await testSubjects.click('aiopsChangePointDetectionAttachButton');
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.missingOrFail(`aiopsChangePointDetectionAttachButton`);
        await testSubjects.existOrFail(`aiopsChangePointDetectionAttachToDashboardButton`);
      });
    },

    async clickAttachDashboardButton() {
      await testSubjects.click('aiopsChangePointDetectionAttachToDashboardButton');
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail(`aiopsChangePointDetectionDashboardAttachmentForm`);
      });
    },

    async assertApplyTimeRangeControl(expectedValue: boolean) {
      const isChecked = await testSubjects.isEuiSwitchChecked(
        `aiopsChangePointDetectionAttachToDashboardApplyTimeRangeSwitch`
      );
      expect(isChecked).to.eql(
        expectedValue,
        `Expected apply time range to be ${expectedValue ? 'enabled' : 'disabled'}`
      );
    },

    async assertMaxSeriesControl(expectedValue: number) {
      const currentValue = Number(
        await testSubjects.getAttribute('aiopsMaxSeriesControlFieldNumber', 'value')
      );
      expect(currentValue).to.eql(
        expectedValue,
        `Expected max series control to be ${expectedValue} (got ${currentValue})`
      );
    },

    async toggleApplyTimeRangeControl(isChecked: boolean) {
      await testSubjects.setEuiSwitch(
        `aiopsChangePointDetectionAttachToDashboardApplyTimeRangeSwitch`,
        isChecked ? 'check' : 'uncheck'
      );
      await this.assertApplyTimeRangeControl(isChecked);
    },

    async setMaxSeriesControl(value: number) {
      await testSubjects.setValue('aiopsMaxSeriesControlFieldNumber', value.toString());
      await this.assertMaxSeriesControl(value);
    },

    async completeDashboardAttachmentForm(attachmentOptions: DashboardAttachmentOptions) {
      // assert default values
      await this.assertApplyTimeRangeControl(false);
      await this.assertMaxSeriesControl(6);

      if (attachmentOptions.applyTimeRange) {
        await this.toggleApplyTimeRangeControl(attachmentOptions.applyTimeRange);
      }

      if (attachmentOptions.maxSeries) {
        await this.setMaxSeriesControl(attachmentOptions.maxSeries);
      }

      await testSubjects.click('aiopsChangePointDetectionSubmitDashboardAttachButton');

      await retry.tryForTime(30 * 1000, async () => {
        // await testSubjects.missingOrFail(`aiopsChangePointDetectionSubmitDashboardAttachButton`);
        await testSubjects.existOrFail('savedObjectSaveModal');
      });
    },

    async completeSaveToDashboardForm(options?: { createNew: boolean; dashboardName?: string }) {
      await retry.tryForTime(30 * 1000, async () => {
        const dashboardSelector = await testSubjects.find('add-to-dashboard-options');

        if (options?.createNew) {
          const label = await dashboardSelector.findByCssSelector(
            `label[for="new-dashboard-option"]`
          );
          await label.click();
        }

        await testSubjects.click('confirmSaveSavedObjectButton');
        await retry.waitForWithTimeout('Save modal to disappear', 1000, () =>
          testSubjects
            .missingOrFail('confirmSaveSavedObjectButton')
            .then(() => true)
            .catch(() => false)
        );

        // make sure the dashboard page actually loaded
        const dashboardItemCount = await dashboardPage.getSharedItemsCount();
        expect(dashboardItemCount).to.not.eql(undefined);
      });
      // changing to the dashboard app might take some time
      const embeddable = await testSubjects.find('aiopsEmbeddableChangePointChart', 30 * 1000);
      const lensChart = await embeddable.findByClassName('lnsExpressionRenderer');
      expect(await lensChart.isDisplayed()).to.eql(
        true,
        'Change point detection chart should be displayed in dashboard'
      );
    },

    async attachChartsToDashboard(
      panelIndex: number,
      attachmentOptions: DashboardAttachmentOptions
    ) {
      await this.assertPanelExist(panelIndex);
      await this.openPanelContextMenu(panelIndex);
      await this.clickAttachChartsButton();
      await this.clickAttachDashboardButton();
      await this.completeDashboardAttachmentForm(attachmentOptions);
      await this.completeSaveToDashboardForm({ createNew: true });
    },

    async assertFiltersApplied() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('filter-items-group');
      });
    },

    getTable(index: number) {
      return tableService.getServiceInstance(
        'ChangePointResultsTable',
        `aiopsChangePointResultsTable`,
        'aiopsChangePointResultsTableRow',
        [
          { id: 'timestamp', testSubj: 'aiopsChangePointTimestamp' },
          { id: 'preview', testSubj: 'aiopsChangePointPreview' },
          { id: 'type', testSubj: 'aiopsChangePointType' },
          { id: 'pValue', testSubj: 'aiopsChangePointPValue' },
          { id: 'groupName', testSubj: 'aiopsChangePointGroupName' },
          { id: 'groupValue', testSubj: 'aiopsChangePointGroupValue' },
        ],
        '',
        `aiopsChangePointPanel_${index}`
      );
    },
  };
}
