/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningLensVisualizationsProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');

  return {
    async clickCreateMLJobMenuAction(title = '') {
      await dashboardPanelActions.clickContextMenuItemByTitle(
        'embeddablePanelAction-create-ml-ad-job-action',
        title
      );
    },
    async clickCreateJob(layerIndex: number) {
      await testSubjects.clickWhenNotDisabledWithoutRetry(
        `mlLensLayerCreateJobButton_${layerIndex}`
      );
    },
    async clickCreateJobFromLayerWithWizard(layerIndex: number) {
      await testSubjects.click(`mlLensLayerCreateWithWizardButton_${layerIndex}`);
    },
    async assertLayerSelectorExists() {
      await testSubjects.existOrFail('mlFlyoutLayerSelector');
    },
    async assertMLJobMenuActionDoesNotExist(title = '') {
      await dashboardPanelActions.expectMissingPanelAction(
        'embeddablePanelAction-create-ml-ad-job-action',
        title
      );
    },
    async assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers: number) {
      const compatibleLayers = await testSubjects.findAll('mlLensLayerCompatible');
      expect(compatibleLayers.length).to.eql(
        numberOfCompatibleLayers,
        `Expected number of compatible layers to be ${numberOfCompatibleLayers} (got '${compatibleLayers.length}')`
      );
    },
    async assertNumberOfCompatibleMapLayers(numberOfCompatibleLayers: number) {
      const compatibleLayers = await testSubjects.findAll('mlMapLayerCompatible');
      expect(compatibleLayers.length).to.eql(
        numberOfCompatibleLayers,
        `Expected number of compatible layers to be ${numberOfCompatibleLayers} (got '${compatibleLayers.length}')`
      );
    },
    async assertNumberOfIncompatibleLensLayers(numberOfIncompatibleLayers: number) {
      const incompatibleLayers = await testSubjects.findAll('mlLensLayerIncompatible');
      expect(incompatibleLayers.length).to.eql(
        numberOfIncompatibleLayers,
        `Expected number of compatible layers to be ${numberOfIncompatibleLayers} (got '${incompatibleLayers.length}')`
      );
    },
    async assertJobIdValue(expectedValue: string, layerIndex: number) {
      const actualJobId = await testSubjects.getAttribute(
        `mlLensLayerJobIdInput_${layerIndex}`,
        'value'
      );
      expect(actualJobId).to.eql(
        expectedValue,
        `Expected job id value to be '${expectedValue}' (got '${actualJobId}')`
      );
    },

    async setJobId(jobId: string, layerIndex: number) {
      await mlCommonUI.setValueWithChecks(`mlLensLayerJobIdInput_${layerIndex}`, jobId, {
        clearWithKeyboard: true,
      });
      await this.assertJobIdValue(jobId, layerIndex);
    },

    async assertJobHasBeenCreated(layerIndex: number) {
      await testSubjects.existOrFail(`mlLensLayerCompatible.jobCreated.success_${layerIndex}`, {
        timeout: 60 * 1000,
      });
    },
    async clickViewResults(layerIndex: number) {
      await testSubjects.click(`mlLensLayerResultsButton_${layerIndex}`);
    },
    async singleMetricViewerPageLoaded() {
      await testSubjects.existOrFail('~mlPageSingleMetricViewer');
    },
    async anomalyExplorerPageLoaded() {
      await testSubjects.existOrFail('~mlPageAnomalyExplorer');
    },
  };
}
