/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningLensVisualizationsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async clickCreateMLJobMenuAction() {
      await testSubjects.click('embeddablePanelAction-create-ml-ad-job-action');
    },
    async clickCreateJobFromLayer(layerIndex: number) {
      await testSubjects.click(`mlLensLayerCompatibleButton_${layerIndex}`);
    },
    async assertLensLayerSelectorExists() {
      await testSubjects.existOrFail('mlFlyoutLensLayerSelector');
    },
    async assertMLJobMenuActionDoesNotExist() {
      await testSubjects.missingOrFail('embeddablePanelAction-create-ml-ad-job-action');
    },
    async assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers: number) {
      const compatibleLayers = await testSubjects.findAll('mlLensLayerCompatible');
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
  };
}
