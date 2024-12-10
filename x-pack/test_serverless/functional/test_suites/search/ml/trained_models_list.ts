/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SUPPORTED_TRAINED_MODELS } from '@kbn/test-suites-xpack/functional/services/ml/api';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const PageObjects = getPageObjects(['svlCommonPage']);

  describe('Trained models list', function () {
    const tinyElser = SUPPORTED_TRAINED_MODELS.TINY_ELSER;

    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
      await ml.api.importTrainedModel(tinyElser.name, tinyElser.name);
      // Make sure the .ml-stats index is created in advance, see https://github.com/elastic/elasticsearch/issues/65846
      await ml.api.assureMlStatsIndexExists();
      await ml.api.syncSavedObjects();
    });

    after(async () => {
      await ml.api.deleteAllTrainedModelsES();
    });

    describe('page navigation', () => {
      it('renders trained models list', async () => {
        await ml.navigation.navigateToMl();
        await ml.testExecution.logTestStep('should load the trained models page');

        await ml.testExecution.logTestStep(
          'should display the stats bar and the analytics table with 1 installed trained model and built in elser models in the table'
        );
        await ml.trainedModels.assertStats(2);
        await ml.trainedModelsTable.assertTableIsPopulated();
      });
    });

    describe('trained models table', () => {
      it('sets correct VCU ranges for start model deployment', async () => {
        await ml.trainedModelsTable.openStartDeploymentModal(tinyElser.name);
        await ml.trainedModelsTable.toggleAdvancedConfiguration(true);

        await ml.testExecution.logTestStep('should have correct default VCU level');
        // Assert that the default selected level is Low
        await ml.trainedModelsTable.assertVCPULevel('low');
        // Assert VCU levels values
        await ml.trainedModelsTable.assertVCPUHelperText(
          'This level limits resources to 16 VCUs, which may be suitable for development, testing, and demos depending on your parameters. It is not recommended for production use.'
        );

        await ml.testExecution.logTestStep(
          'should set control to high VCU level and update helper text'
        );
        await ml.trainedModelsTable.setVCPULevel('high');
        await ml.trainedModelsTable.assertVCPUHelperText(
          'Your model will scale up to a maximum of 4,096 VCUs per hour based on your search or ingest load. It will automatically scale down when demand decreases, and you only pay for the resources you use.'
        );

        // Adaptive resources switch should be checked by default
        await ml.trainedModelsTable.assertAdaptiveResourcesSwitchChecked(true);

        // Static allocations should be allowed for search projects
        await ml.trainedModelsTable.toggleAdaptiveResourcesSwitch(false);

        await ml.trainedModelsTable.assertVCPUHelperText(
          'Your model will consume 4,096 VCUs, even when not in use.'
        );
      });
    });
  });
}
