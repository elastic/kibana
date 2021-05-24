/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';
import { MlDashboardJobSelectionTable } from './dashboard_job_selection_table';

export function MachineLearningDashboardEmbeddablesProvider(
  { getService, getPageObjects }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  mlDashboardJobSelectionTable: MlDashboardJobSelectionTable
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const listingTable = getService('listingTable');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  return {
    async assertAnomalyChartsEmbeddableInitializerExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('mlAnomalyChartsEmbeddableInitializer');
      });
    },

    async assertAnomalyChartsEmbeddableInitializerNotExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.missingOrFail('mlAnomalyChartsEmbeddableInitializer');
      });
    },

    async assertSelectMaxSeriesToPlotValue(expectedValue: number) {
      const subj = 'mlAnomalyChartsInitializerMaxSeries';
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        const input = await testSubjects.find(subj);
        const actualValue = await input.getAttribute('value');

        expect(actualValue).to.eql(
          expectedValue,
          `Expected max series to plot value to be ${expectedValue}, got ${actualValue}`
        );
      });
    },

    async assertInitializerConfirmButtonEnabled() {
      const subj = 'mlAnomalyChartsInitializerConfirmButton';

      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        await testSubjects.isEnabled(subj);
      });
    },

    async clickInitializerConfirmButtonEnabled() {
      const subj = 'mlAnomalyChartsInitializerConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled();
        await testSubjects.clickWhenNotDisabled(subj);
        await this.assertAnomalyChartsEmbeddableInitializerNotExists();
      });
    },

    async assertDashboardIsEmpty() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('emptyDashboardWidget');
      });
    },

    async assertDashboardPanelExists(title: string) {
      await retry.tryForTime(5000, async () => {
        await find.existsByLinkText(title);
      });
    },

    async assertAnomalyChartsSeverityThresholdControlExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlAnomalySeverityThresholdControls`);
      });
    },

    async assertNoMatchingAnomaliesMessageExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlNoMatchingAnomaliesMessage`);
      });
    },

    async assertAnomalyChartsExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlExplorerChartsContainer`);
      });
    },

    async openJobSelectionFlyout() {
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await testSubjects.existOrFail('dashboardEditorContextMenu', { timeout: 2000 });

        await dashboardAddPanel.clickEmbeddableFactoryGroupButton('ml');
        await dashboardAddPanel.clickAddNewEmbeddableLink('ml_anomaly_charts');

        await mlDashboardJobSelectionTable.assertJobSelectionTableExists();
      });
    },

    async saveDashboard(dashboardName: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.dashboard.saveDashboard(dashboardName, {
          saveAsNew: false,
          waitDialogIsClosed: true,
          exitFromEditMode: true,
        });
      });
    },

    async deleteDashboard(dashboardName: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.searchForItemWithName(dashboardName);
        await listingTable.checkListingSelectAllCheckbox();
        await listingTable.clickDeleteSelected();
        await PageObjects.common.clickConfirmOnModal();
      });
    },
  };
}
