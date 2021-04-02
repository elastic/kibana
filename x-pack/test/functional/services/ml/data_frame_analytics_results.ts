/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';

import { FtrProviderContext } from '../../ftr_provider_context';

import type { CanvasElementColorStats } from '../canvas_element';
import type { MlCommonUI } from './common_ui';

export function MachineLearningDataFrameAnalyticsResultsProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertRegressionEvaluatePanelElementsExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-RegressionEvaluation');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionGenMSEstat');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionGenRSquaredStat');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionTrainingMSEstat');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionTrainingRSquaredStat');
    },

    async assertRegressionTablePanelExists() {
      await testSubjects.existOrFail('mlDFAnalyticsExplorationTablePanel');
    },

    async assertClassificationEvaluatePanelElementsExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-ClassificationEvaluation');
      await testSubjects.existOrFail('mlDFAnalyticsClassificationExplorationConfusionMatrix');
      await testSubjects.existOrFail('mlDFAnalyticsClassificationExplorationRocCurveChart');
    },

    async assertClassificationTablePanelExists() {
      await testSubjects.existOrFail('mlDFAnalyticsExplorationTablePanel');
    },

    async assertOutlierTablePanelExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-results');
    },

    async assertResultsTableExists() {
      await testSubjects.existOrFail('mlExplorationDataGrid loaded', { timeout: 5000 });
    },

    async assertResultsTableTrainingFiltersExist() {
      await testSubjects.existOrFail('mlDFAnalyticsExplorationQueryBarFilterButtons', {
        timeout: 5000,
      });
    },

    async getResultTableRows() {
      return (await testSubjects.find('mlExplorationDataGrid loaded')).findAllByTestSubject(
        'dataGridRowCell'
      );
    },

    async assertResultsTableNotEmpty() {
      const resultTableRows = await this.getResultTableRows();
      expect(resultTableRows.length).to.be.greaterThan(
        0,
        `DFA results table should have at least one row (got '${resultTableRows.length}')`
      );
    },

    async assertTotalFeatureImportanceEvaluatePanelExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-FeatureImportanceSummary');
      await testSubjects.existOrFail('mlTotalFeatureImportanceChart', { timeout: 5000 });
    },

    async assertFeatureImportanceDecisionPathElementsExists() {
      await testSubjects.existOrFail('mlDFADecisionPathPopoverTab-decision_path_chart', {
        timeout: 5000,
      });
      await testSubjects.existOrFail('mlDFADecisionPathPopoverTab-decision_path_json', {
        timeout: 5000,
      });
    },

    async setScatterplotMatrixSampleSizeSelectValue(selectValue: string) {
      await testSubjects.selectValue('mlScatterplotMatrixSampleSizeSelect', selectValue);

      const actualSelectState = await testSubjects.getAttribute(
        'mlScatterplotMatrixSampleSizeSelect',
        'value'
      );

      expect(actualSelectState).to.eql(
        selectValue,
        `Sample size should be '${selectValue}' (got '${actualSelectState}')`
      );
    },

    async getScatterplotMatrixRandomizeQuerySwitchCheckState(): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        'mlScatterplotMatrixRandomizeQuerySwitch',
        'aria-checked'
      );
      return state === 'true';
    },

    async assertScatterplotMatrixRandomizeQueryCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getScatterplotMatrixRandomizeQuerySwitchCheckState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Randomize query check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async setScatterplotMatrixRandomizeQueryCheckState(checkState: boolean) {
      await retry.tryForTime(30000, async () => {
        if ((await this.getScatterplotMatrixRandomizeQuerySwitchCheckState()) !== checkState) {
          await testSubjects.click('mlScatterplotMatrixRandomizeQuerySwitch');
        }
        await this.assertScatterplotMatrixRandomizeQueryCheckState(checkState);
      });
    },

    async assertScatterplotMatrix(expectedValue: CanvasElementColorStats) {
      await testSubjects.existOrFail('mlDFExpandableSection-splom > mlScatterplotMatrix loaded', {
        timeout: 5000,
      });
      await testSubjects.scrollIntoView('mlDFExpandableSection-splom > mlScatterplotMatrix loaded');
      await mlCommonUI.assertColorsInCanvasElement(
        'mlDFExpandableSection-splom',
        expectedValue,
        ['#000000'],
        undefined,
        undefined,
        // increased tolerance up from 10 to 20
        // since the returned randomized colors vary quite a bit on each run.
        20
      );
    },

    async assertFeatureImportanceDecisionPathChartElementsExists() {
      await testSubjects.existOrFail('mlDFADecisionPathChart', {
        timeout: 5000,
      });
    },

    async openFeatureImportanceDecisionPathPopover() {
      this.assertResultsTableNotEmpty();

      const featureImportanceCell = await this.getFirstFeatureImportanceCell();
      await featureImportanceCell.focus();
      const interactionButton = await featureImportanceCell.findByTagName('button');

      // simulate hover and wait for button to appear
      await featureImportanceCell.moveMouseTo();
      await this.waitForInteractionButtonToDisplay(interactionButton);

      // open popover
      await interactionButton.click();
      await testSubjects.existOrFail('mlDFADecisionPathPopover');
    },

    async getFirstFeatureImportanceCell(): Promise<WebElementWrapper> {
      // get first row of the data grid
      const dataGrid = await testSubjects.find('mlExplorationDataGrid loaded');
      // find the feature importance cell in that row
      const featureImportanceCell = await dataGrid.findByCssSelector(
        '[data-test-subj="dataGridRowCell"][class*="featureImportance"]'
      );
      return featureImportanceCell;
    },

    async assertFeatureInfluenceCellNotEmpty() {
      // get first row of the data grid
      const dataGrid = await testSubjects.find('mlExplorationDataGrid loaded');
      // find the feature influence cell in that row
      const featureInfluenceCell = await dataGrid.findByCssSelector(
        '[data-test-subj="dataGridRowCell"][class*="featureInfluence"]'
      );
      const contentString = await featureInfluenceCell.getVisibleText();

      expect(contentString.length).to.be.greaterThan(
        0,
        'Expected feature influence cell to have content but it is empty.'
      );
    },

    async waitForInteractionButtonToDisplay(interactionButton: WebElementWrapper) {
      await retry.tryForTime(5000, async () => {
        const buttonVisible = await interactionButton.isDisplayed();
        expect(buttonVisible).to.equal(true, 'Expected data grid cell button to be visible');
      });
    },
  };
}
