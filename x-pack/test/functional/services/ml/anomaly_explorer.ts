/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningAnomalyExplorerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

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

    async openAddToDashboardControl() {
      await testSubjects.click('mlAnomalyTimelinePanelMenu');
      await testSubjects.click('mlAnomalyTimelinePanelAddToDashboardButton');
      await testSubjects.existOrFail('mlAddToDashboardModal');
    },

    async addAndEditSwimlaneInDashboard(dashboardTitle: string) {
      await this.filterWithSearchString(dashboardTitle);
      await testSubjects.isDisplayed('mlDashboardSelectionTable > checkboxSelectAll');
      await testSubjects.clickWhenNotDisabled('mlDashboardSelectionTable > checkboxSelectAll');
      expect(await testSubjects.isChecked('mlDashboardSelectionTable > checkboxSelectAll')).to.be(
        true
      );
      await testSubjects.clickWhenNotDisabled('mlAddAndEditDashboardButton');
      const embeddable = await testSubjects.find('mlAnomalySwimlaneEmbeddableWrapper');
      const swimlane = await embeddable.findByClassName('ml-swimlanes');
      expect(await swimlane.isDisplayed()).to.eql(
        true,
        'Anomaly swimlane should be displayed in dashboard'
      );
    },

    async waitForDashboardsToLoad() {
      await testSubjects.existOrFail('~mlDashboardSelectionTable', { timeout: 60 * 1000 });
    },

    async filterWithSearchString(filter: string) {
      await this.waitForDashboardsToLoad();
      const searchBarInput = await testSubjects.find('mlDashboardsSearchBox');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
    },
  };
}
