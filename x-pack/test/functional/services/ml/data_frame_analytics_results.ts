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
import type { MlCommonDataGrid } from './common_data_grid';

export function MachineLearningDataFrameAnalyticsResultsProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  commonDataGrid: MlCommonDataGrid
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

    async scrollRocCurveChartIntoView() {
      await testSubjects.scrollIntoView('mlDFAnalyticsClassificationExplorationRocCurveChart');
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

    async assertResultsTablePreviewHistogramChartButtonCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlExplorationDataGridHistogramButton',
          'aria-pressed'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Chart histogram button check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async enableResultsTablePreviewHistogramCharts(expectedButtonState: boolean) {
      await retry.tryForTime(5000, async () => {
        const actualState =
          (await testSubjects.getAttribute(
            'mlExplorationDataGridHistogramButton',
            'aria-pressed'
          )) === 'true';

        if (actualState !== expectedButtonState) {
          await testSubjects.click('mlExplorationDataGridHistogramButton');
          await this.assertResultsTablePreviewHistogramChartButtonCheckState(expectedButtonState);
        }
      });
    },

    async assertResultsTablePreviewHistogramChartsMissing(
      expectedHistogramCharts: Array<{
        chartAvailable: boolean;
        id: string;
        legend?: string;
      }>
    ) {
      for (const expected of expectedHistogramCharts.values()) {
        const id = expected.id;
        await testSubjects.missingOrFail(`mlDataGridChart-${id}`);
      }
    },

    async assertResultsTablePreviewHistogramCharts(
      expectedHistogramCharts: Array<{
        chartAvailable: boolean;
        id: string;
        legend?: string;
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
          }

          const actualLegend = await testSubjects.getVisibleText(`mlDataGridChart-${id}-legend`);
          if (expected.legend) {
            expect(actualLegend).to.eql(
              expected.legend,
              `Legend text for column '${id}' should be '${expected.legend}' (got '${actualLegend}')`
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

    async assertColumnSelectPopoverOpenState(expectedState: boolean) {
      await commonDataGrid.assertColumnSelectPopoverOpenState(
        'mlExplorationDataGrid',
        expectedState
      );
    },

    async toggleColumnSelectPopoverState(state: boolean) {
      await commonDataGrid.toggleColumnSelectPopoverState('mlExplorationDataGrid', state);
    },

    async hideAllResultsTableColumns() {
      await commonDataGrid.hideAllColumns('mlExplorationDataGrid');
      await this.assertResultsTableEmpty();
    },

    async showAllResultsTableColumns() {
      await commonDataGrid.showAllColumns('mlExplorationDataGrid');
      await this.assertResultsTableNotEmpty();
    },

    async assertColumnSortPopoverOpenState(expectedOpenState: boolean) {
      await commonDataGrid.assertColumnSortPopoverOpenState(
        'mlExplorationDataGrid',
        expectedOpenState
      );
    },

    async toggleColumnSortPopoverState(expectedState: boolean) {
      await commonDataGrid.toggleColumnSortPopoverState('mlExplorationDataGrid', expectedState);
    },

    async setColumnToSortBy(columnId: string, sortDirection: 'asc' | 'desc') {
      await commonDataGrid.setColumnToSortBy('mlExplorationDataGrid', columnId, sortDirection);
    },

    async assertResultsTableColumnValues(column: number, expectedColumnValues: string[]) {
      await commonDataGrid.assertEuiDataGridColumnValues(
        'mlExplorationDataGrid',
        column,
        expectedColumnValues
      );
    },

    async assertResultsTableNotEmpty() {
      await commonDataGrid.assertEuiDataGridNotEmpty('mlExplorationDataGrid loaded');
    },

    async assertResultsTableEmpty() {
      await commonDataGrid.assertEuiDataGridEmpty('mlExplorationDataGrid loaded');
    },

    async assertTotalFeatureImportanceEvaluatePanelExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-FeatureImportanceSummary');
      await this.scrollFeatureImportanceIntoView();
      await testSubjects.existOrFail('mlTotalFeatureImportanceChart', { timeout: 30 * 1000 });
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

    async assertScatterplotMatrixLoaded() {
      await testSubjects.existOrFail('mlDFExpandableSection-splom > mlScatterplotMatrix loaded', {
        timeout: 5000,
      });
    },

    async assertScatterplotMatrix(expectedValue: CanvasElementColorStats) {
      await this.assertScatterplotMatrixLoaded();
      await this.scrollScatterplotMatrixIntoView();
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

    async assertFeatureImportancePopoverContent() {
      // we have two different types of content depending on the number of features returned
      // by the analysis: decision path view with chart and JSON tabs or a plain JSON only view
      if (await testSubjects.exists('mlDFADecisionPathJSONViewer', { timeout: 1000 })) {
        const jsonContent = await testSubjects.getVisibleText('mlDFADecisionPathJSONViewer');
        expect(jsonContent.length).greaterThan(
          0,
          `Feature importance JSON popover content should not be empty`
        );
      } else if (await testSubjects.exists('mlDFADecisionPathPopover', { timeout: 1000 })) {
        await this.assertFeatureImportanceDecisionPathElementsExists();
        await this.assertFeatureImportanceDecisionPathChartElementsExists();
      } else {
        throw new Error('Expected either decision path popover or JSON viewer to exist.');
      }
    },

    async openFeatureImportancePopover() {
      this.assertResultsTableNotEmpty();

      await retry.tryForTime(30 * 1000, async () => {
        const featureImportanceCell = await this.getFirstFeatureImportanceCell();
        await featureImportanceCell.focus();
        const interactionButton = await featureImportanceCell.findByTagName('button');

        // simulate hover and wait for button to appear
        await featureImportanceCell.moveMouseTo();
        await this.waitForInteractionButtonToDisplay(interactionButton);

        // open popover
        await interactionButton.click();
        await testSubjects.existOrFail('mlDFAFeatureImportancePopover', { timeout: 1000 });
      });
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

    async scrollContentSectionIntoView(sectionId: string) {
      await testSubjects.scrollIntoView(`mlDFExpandableSection-${sectionId}`);
    },

    async scrollAnalysisIntoView() {
      await this.scrollContentSectionIntoView('analysis');
    },

    async scrollRegressionEvaluationIntoView() {
      await this.scrollContentSectionIntoView('RegressionEvaluation');
    },

    async scrollClassificationEvaluationIntoView() {
      await this.scrollContentSectionIntoView('ClassificationEvaluation');
    },

    async scrollFeatureImportanceIntoView() {
      await this.scrollContentSectionIntoView('FeatureImportanceSummary');
    },

    async scrollScatterplotMatrixIntoView() {
      await this.scrollContentSectionIntoView('splom');
    },

    async scrollResultsIntoView() {
      await this.scrollContentSectionIntoView('results');
    },

    async expandContentSection(sectionId: string, shouldExpand: boolean) {
      const contentSubj = `mlDFExpandableSection-${sectionId}-content`;
      const expandableContentExists = await testSubjects.exists(contentSubj, { timeout: 1000 });

      if (expandableContentExists !== shouldExpand) {
        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.clickWhenNotDisabled(
            `mlDFExpandableSection-${sectionId}-toggle-button`
          );
          if (shouldExpand) {
            await testSubjects.existOrFail(contentSubj, { timeout: 1000 });
          } else {
            await testSubjects.missingOrFail(contentSubj, { timeout: 1000 });
          }
        });
      }
    },

    async expandAnalysisSection(shouldExpand: boolean) {
      await this.expandContentSection('analysis', shouldExpand);
    },

    async expandRegressionEvaluationSection(shouldExpand: boolean) {
      await this.expandContentSection('RegressionEvaluation', shouldExpand);
    },

    async expandClassificationEvaluationSection(shouldExpand: boolean) {
      await this.expandContentSection('ClassificationEvaluation', shouldExpand);
    },

    async expandFeatureImportanceSection(shouldExpand: boolean) {
      await this.expandContentSection('FeatureImportanceSummary', shouldExpand);
    },

    async expandScatterplotMatrixSection(shouldExpand: boolean) {
      await this.expandContentSection('splom', shouldExpand);
    },

    async expandResultsSection(shouldExpand: boolean) {
      await this.expandContentSection('results', shouldExpand);
    },
  };
}
