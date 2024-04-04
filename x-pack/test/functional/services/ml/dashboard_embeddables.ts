/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlDashboardJobSelectionTable } from './dashboard_job_selection_table';

export function MachineLearningDashboardEmbeddablesProvider(
  { getService, getPageObjects }: FtrProviderContext,
  mlDashboardJobSelectionTable: MlDashboardJobSelectionTable
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  // const ml = getService('ml');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects(['discover']);

  return {
    async assertAnomalyChartsEmbeddableInitializerExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail('mlAnomalyChartsEmbeddableInitializer', { timeout: 1000 });
      });
    },

    async assertSingleMetricViewerEmbeddableInitializerExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail('mlSingleMetricViewerEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertSingleMetricViewerEmbeddableInitializerNotExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('mlSingleMetricViewerEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertAnomalyChartsEmbeddableInitializerNotExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('mlAnomalyChartsEmbeddableInitializer', { timeout: 1000 });
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

    async assertInitializerConfirmButtonEnabled(subj: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        await testSubjects.isEnabled(subj);
      });
    },

    async clickInitializerConfirmButtonEnabled() {
      const subj = 'mlAnomalyChartsInitializerConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled(subj);
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertAnomalyChartsEmbeddableInitializerNotExists();
      });
    },

    async clickSingleMetricViewerInitializerConfirmButtonEnabled() {
      const subj = 'mlSingleMetricViewerInitializerConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled(subj);
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertSingleMetricViewerEmbeddableInitializerNotExists();
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
      await retry.tryForTime(3 * 60 * 1000, async () => {
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

    async assertAnomalySwimlaneExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(`mlAnomalySwimlaneEmbeddableWrapper`);
      });
    },

    async openAnomalyJobSelectionFlyout(
      mlEmbeddableType: 'ml_anomaly_swimlane' | 'ml_anomaly_charts' | 'ml_single_metric_viewer'
    ) {
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await testSubjects.existOrFail('dashboardEditorContextMenu', { timeout: 2000 });

        await dashboardAddPanel.clickEmbeddableFactoryGroupButton('ml');
        await dashboardAddPanel.clickAddNewEmbeddableLink(mlEmbeddableType);

        await mlDashboardJobSelectionTable.assertJobSelectionTableExists();
      });
    },

    async selectDiscoverIndexPattern(indexPattern: string) {
      await dataViews.switchTo(indexPattern);
    },
  };
}
