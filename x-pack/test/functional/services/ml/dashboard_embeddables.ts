/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningDashboardEmbeddablesProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

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
      await testSubjects.existOrFail(subj);
      const input = await testSubjects.find(subj);
      const actualValue = await input.getAttribute('value');

      expect(actualValue).to.eql(
        expectedValue,
        `Expected max series to plot value to be ${expectedValue}, got ${actualValue}`
      );
    },

    async assertPanelTitle(expectedValue: string) {
      const actualValue = await testSubjects.getAttribute('panelTitleInput', 'value');
      expect(actualValue).to.eql(
        expectedValue,
        `Panel title should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async setPanelTitle(panelTitle: string) {
      await mlCommonUI.setValueWithChecks('panelTitleInput', panelTitle, {
        clearWithKeyboard: true,
      });
      await this.assertPanelTitle(panelTitle);
    },

    async assertInitializerConfirmButtonEnabled() {
      const subj = 'mlAnomalyChartsInitializerConfirmButton';
      await testSubjects.existOrFail(subj);
      await testSubjects.isEnabled(subj);
    },

    async clickInitializerConfirmButtonEnabled() {
      const subj = 'mlAnomalyChartsInitializerConfirmButton';
      await this.assertInitializerConfirmButtonEnabled();
      await testSubjects.clickWhenNotDisabled(subj);
      await this.assertAnomalyChartsEmbeddableInitializerNotExists();
    },

    async assertDashboardIsEmpty() {
      await testSubjects.existOrFail('emptyDashboardWidget');
    },

    async assertDashboardPanelExists(title: string) {
      await retry.tryForTime(5000, async () => {
        await find.existsByLinkText(title);
      });
    },

    async assertAnomalyChartsSeverityThresholdControlExists() {
      await testSubjects.existOrFail(`mlAnomalySeverityThresholdControls`);
    },

    async assertNoMatchingAnomaliesMessageExists() {
      await testSubjects.existOrFail(`mlNoMatchingAnomaliesMessage`);
    },

    async assertAnomalyChartsExists() {
      await testSubjects.existOrFail(`mlExplorerChartsContainer`);
    },
  };
}
