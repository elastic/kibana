/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsResultsProvider({
  getService,
}: FtrProviderContext) {
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
      return await testSubjects.findAll('mlExplorationDataGrid loaded > dataGridRow');
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

    async assertFeatureImportanceDecisionPathChartElementsExists() {
      await testSubjects.existOrFail('mlDFADecisionPathChart', {
        timeout: 5000,
      });
    },

    async openFeatureImportanceDecisionPathPopover() {
      this.assertResultsTableNotEmpty();

      const featureImportanceCell = await this.getFirstFeatureImportanceCell();
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
      const firstDataGridRow = await testSubjects.find(
        'mlExplorationDataGrid loaded > dataGridRow'
      );
      // find the feature importance cell in that row
      const featureImportanceCell = await firstDataGridRow.findByCssSelector(
        '[data-test-subj="dataGridRowCell"][class*="featureImportance"]'
      );
      return featureImportanceCell;
    },

    async waitForInteractionButtonToDisplay(interactionButton: WebElementWrapper) {
      await retry.tryForTime(5000, async () => {
        const buttonVisible = await interactionButton.isDisplayed();
        expect(buttonVisible).to.equal(true, 'Expected data grid cell button to be visible');
      });
    },
  };
}
