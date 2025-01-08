/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function AiopsDashboardEmbeddablesProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const dashboardAddPanel = getService('dashboardAddPanel');

  return {
    async assertLogRateAnalysisEmbeddableInitializerExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail('aiopsLogRateAnalysisEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertLogRateAnalysisEmbeddableInitializerNotExists() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('aiopsLogRateAnalysisEmbeddableInitializer', {
          timeout: 1000,
        });
      });
    },

    async assertInitializerConfirmButtonEnabled(subj: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        await testSubjects.isEnabled(subj);
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

    async assertLogsAiopsSectionExists(expectExist = true) {
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('logs-aiops', expectExist);
      });
    },

    async clickLogRateAnalysisInitializerConfirmButtonEnabled() {
      const subj = 'aiopsLogRateAnalysisConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertInitializerConfirmButtonEnabled(subj);
        await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
        await this.assertLogRateAnalysisEmbeddableInitializerNotExists();
      });
    },

    async openEmbeddableInitializer(mlEmbeddableType: 'aiopsLogRateAnalysisEmbeddable') {
      const name = {
        aiopsLogRateAnalysisEmbeddable: 'Log rate analysis',
      };
      await retry.tryForTime(60 * 1000, async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await testSubjects.existOrFail('dashboardPanelSelectionFlyout', { timeout: 2000 });

        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('logs-aiops');

        await dashboardAddPanel.clickAddNewPanelFromUIActionLink(name[mlEmbeddableType]);
        await testSubjects.existOrFail('aiopsLogRateAnalysisControls', { timeout: 2000 });
      });
    },

    async assertLogRateAnalysisEmbeddableDataViewSelectorExists() {
      await testSubjects.existOrFail(
        'aiopsLogRateAnalysisEmbeddableDataViewSelector > comboBoxInput'
      );
    },

    async assertLogRateAnalysisEmbeddableDataViewSelection(dataViewValue: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'aiopsLogRateAnalysisEmbeddableDataViewSelector > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        [dataViewValue],
        `Expected data view selection  to be '${dataViewValue}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectLogRateAnalysisEmbeddableDataView(dataViewValue: string) {
      await comboBox.set(
        'aiopsLogRateAnalysisEmbeddableDataViewSelector > comboBoxInput',
        dataViewValue
      );
      await this.assertLogRateAnalysisEmbeddableDataViewSelection(dataViewValue);
    },
  };
}
