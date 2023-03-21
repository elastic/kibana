/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { SwimlaneType } from '@kbn/ml-plugin/public/application/explorer/explorer_constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import type { CreateCaseParams } from '../cases/create';
import { MlAnomalyCharts } from './anomaly_charts';

export function MachineLearningAnomalyExplorerProvider(
  { getPageObject, getService }: FtrProviderContext,
  anomalyCharts: MlAnomalyCharts
) {
  const dashboardPage = getPageObject('dashboard');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');

  return {
    async assertAnomalyExplorerEmptyListMessageExists() {
      await testSubjects.existOrFail('mlNoJobsFound');
    },

    async assertInfluencerListExists() {
      await testSubjects.existOrFail('mlAnomalyExplorerInfluencerList');
    },

    async assertInfluencerFieldExists(influencerField: string) {
      await testSubjects.existOrFail(`mlInfluencerFieldName ${influencerField}`);
    },

    async getInfluencerFieldLabels(influencerField: string): Promise<string[]> {
      const influencerFieldLabelElements = await testSubjects.findAll(
        `mlInfluencerEntry field-${influencerField} > mlInfluencerEntryFieldLabel`
      );
      const influencerFieldLabels = await Promise.all(
        influencerFieldLabelElements.map(async (elmnt) => await elmnt.getVisibleText())
      );
      return influencerFieldLabels;
    },

    async getQueryBarText() {
      const queryBarElement = await testSubjects.find('explorerQueryInput');
      const queryBarText = await queryBarElement.getVisibleText();
      return queryBarText;
    },

    async assertQueryBarContent(contentString: string) {
      const queryBarText = await this.getQueryBarText();
      expect(queryBarText).to.eql(
        contentString,
        `Expected influencer filter to be '${contentString}' (got '${queryBarText}')`
      );
    },

    async assertInfluencerListContainsLabel(influencerField: string, label: string) {
      const influencerFieldLabels = await this.getInfluencerFieldLabels(influencerField);
      expect(influencerFieldLabels).to.contain(
        label,
        `Expected influencer list for '${influencerField}' to contain label '${label}' (got '${influencerFieldLabels}')`
      );
    },

    async assertInfluencerFieldListLength(influencerField: string, expectedLength: number) {
      const influencerFieldLabels = await this.getInfluencerFieldLabels(influencerField);
      expect(influencerFieldLabels.length).to.eql(
        expectedLength,
        `Expected influencer list for '${influencerField}' to have length '${expectedLength}' (got '${influencerFieldLabels.length}')`
      );
    },

    async assertInfluencerFieldListNotEmpty(influencerField: string) {
      const influencerFieldEntries = await testSubjects.findAll(
        `mlInfluencerEntry field-${influencerField}`
      );
      expect(influencerFieldEntries.length).to.be.greaterThan(
        0,
        `Influencer list for field '${influencerField}' should have at least one entry (got 0)`
      );
    },

    async assertOverallSwimlaneExists() {
      await testSubjects.existOrFail('mlAnomalyExplorerSwimlaneOverall');
    },

    async assertSwimlaneViewByExists() {
      await testSubjects.existOrFail('mlAnomalyExplorerSwimlaneViewBy');
    },

    async assertAnnotationsPanelExists(state: string) {
      await testSubjects.existOrFail(`mlAnomalyExplorerAnnotationsPanel ${state}`, {
        timeout: 30 * 1000,
      });
    },

    async addFilterForInfluencer(influencerField: string, influencerValue: string) {
      await testSubjects.existOrFail(
        `mlAnomaliesTableEntityCellAddFilterButton-${influencerValue}`
      );
      await testSubjects.click(`mlAnomaliesTableEntityCellAddFilterButton-${influencerValue}`);
    },

    async removeFilterForInfluencer(influencerField: string, influencerValue: string) {
      await testSubjects.existOrFail(
        `mlAnomaliesTableEntityCellRemoveFilterButton-${influencerValue}`
      );
      await testSubjects.click(`mlAnomaliesTableEntityCellRemoveFilterButton-${influencerValue}`);
    },

    async openAddToDashboardControl() {
      await testSubjects.click('mlAnomalyTimelinePanelMenu');
      await testSubjects.click('mlAnomalyTimelinePanelAddToDashboardButton');
      await testSubjects.existOrFail('mlAddToDashboardModal');
    },

    async attachSwimLaneToCase(swimLaneType: SwimlaneType = 'overall', params: CreateCaseParams) {
      const attachTestSubject =
        swimLaneType === 'overall'
          ? 'mlAnomalyTimelinePanelAttachOverallButton'
          : 'mlAnomalyTimelinePanelAttachViewByButton';
      await testSubjects.click('mlAnomalyTimelinePanelMenu');
      await testSubjects.click('mlAnomalyTimelinePanelAttachToCaseButton');
      await testSubjects.click(attachTestSubject);

      await cases.create.createCaseFromModal(params);
    },

    async addAndEditSwimlaneInDashboard(dashboardTitle: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.filterDashboardSearchWithSearchString(dashboardTitle);
        await testSubjects.clickWhenNotDisabledWithoutRetry('~mlEmbeddableAddAndEditDashboard');

        // make sure the dashboard page actually loaded
        const dashboardItemCount = await dashboardPage.getSharedItemsCount();
        expect(dashboardItemCount).to.not.eql(undefined);
      });
      // changing to the dashboard app might take sime time
      const embeddable = await testSubjects.find('mlAnomalySwimlaneEmbeddableWrapper', 30 * 1000);
      const swimlane = await embeddable.findByClassName('mlSwimLaneContainer');
      expect(await swimlane.isDisplayed()).to.eql(
        true,
        'Anomaly swim lane should be displayed in dashboard'
      );
    },

    async refreshPage() {
      await testSubjects.click('superDatePickerApplyTimeButton');
    },

    async waitForDashboardsToLoad() {
      await testSubjects.existOrFail('mlDashboardSelectionTable loaded', { timeout: 60 * 1000 });
    },

    async filterDashboardSearchWithSearchString(filter: string, expectedRowCount: number = 1) {
      await retry.tryForTime(20 * 1000, async () => {
        await this.waitForDashboardsToLoad();
        const searchBarInput = await testSubjects.find('mlDashboardsSearchBox');
        await searchBarInput.clearValueWithKeyboard();
        await searchBarInput.type(filter);
        await this.assertDashboardSearchInputValue(filter);
        await this.waitForDashboardsToLoad();

        const dashboardRows = await testSubjects.findAll('~mlDashboardSelectionTableRow', 2000);
        expect(dashboardRows.length).to.eql(
          expectedRowCount,
          `Dashboard table should have ${expectedRowCount} rows, got ${dashboardRows.length}`
        );
      });
    },

    async assertDashboardSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await testSubjects.find('mlDashboardsSearchBox');
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Dashboard search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    },

    async assertClearSelectionButtonVisible(expectVisible: boolean) {
      if (expectVisible) {
        expect(await testSubjects.isDisplayed('mlAnomalyTimelineClearSelection')).to.eql(
          true,
          `Expected 'Clear selection' button to be displayed`
        );
      } else {
        expect(await testSubjects.isDisplayed('mlAnomalyTimelineClearSelection')).to.eql(
          false,
          `Expected 'Clear selection' button to be hidden`
        );
      }
    },

    async clearSwimLaneSelection() {
      await this.assertClearSelectionButtonVisible(true);
      await testSubjects.click('mlAnomalyTimelineClearSelection');
      await this.assertClearSelectionButtonVisible(false);
    },

    async assertAnomalyExplorerChartsCount(expectedChartsCount: number) {
      await anomalyCharts.assertAnomalyExplorerChartsCount(
        'mlExplorerChartsContainer',
        expectedChartsCount
      );
    },

    async scrollChartsContainerIntoView() {
      await testSubjects.scrollIntoView('mlExplorerChartsContainer');
    },

    async scrollMapContainerIntoView() {
      await testSubjects.scrollIntoView('mlAnomaliesMapContainer');
    },

    async assertSingleMetricViewerButtonEnabled(expectedEnabled = true) {
      const isEnabled = await testSubjects.isEnabled(
        'mlAnomalyResultsViewSelectorSingleMetricViewer'
      );
      expect(isEnabled).to.eql(
        expectedEnabled,
        `Expected the Single Metric Viewer button to be '${
          expectedEnabled ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async attachAnomalyChartsToCase(params: CreateCaseParams) {
      await testSubjects.click('mlExplorerAnomalyPanelMenu');
      await testSubjects.click('mlAnomalyAttachChartsToCasesButton');

      await cases.create.createCaseFromModal(params);
    },
  };
}
