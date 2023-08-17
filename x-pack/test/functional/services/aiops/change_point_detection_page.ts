/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlTableService } from '../ml/common_table_service';

export function ChangePointDetectionPageProvider(
  { getService, getPageObject }: FtrProviderContext,
  tableService: MlTableService
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');

  return {
    async navigateToIndexPatternSelection() {
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
