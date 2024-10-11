/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServerlessRoleName } from '../../../../shared/lib';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const svlMl = getService('svlMl');
  const PageObjects = getPageObjects(['svlCommonPage']);

  describe('Trained models list', function () {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole(ServerlessRoleName.PLATFORM_ENGINEER);
      await ml.api.syncSavedObjects();
    });

    describe('page navigation', () => {
      it('renders trained models list', async () => {
        await ml.navigation.navigateToMl();
        await ml.testExecution.logTestStep('should load the trained models page');
        await svlMl.navigation.security.navigateToTrainedModels();

        await ml.testExecution.logTestStep(
          'should display the stats bar and the analytics table with one trained model'
        );
        await ml.trainedModels.assertStats(1);
        await ml.trainedModelsTable.assertTableIsPopulated();
      });

      // TODO enabled when https://github.com/elastic/kibana/issues/195593 is resolved
      it.skip('sets correct VCU ranges for start model deployment', async () => {
        await ml.trainedModelsTable.openStartDeploymentModal('.elser_model_2');
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
          'Your model will scale up to a maximum of 1024 VCUs per hour based on your search or ingest load. It will automatically scale down when demand decreases, and you only pay for the resources you use.'
        );
      });
    });
  });
}
