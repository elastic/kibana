/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const svlMl = getService('svlMl');
  const PageObjects = getPageObjects(['svlCommonPage']);

  // failsOnMKI, see https://github.com/elastic/kibana/issues/180481
  describe('Trained models list', function () {
    this.tags(['failsOnMKI']);

    before(async () => {
      await PageObjects.svlCommonPage.login();
      await ml.api.syncSavedObjects();
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
    });

    describe('page navigation', () => {
      it('renders trained models list', async () => {
        await ml.navigation.navigateToMl();
        await ml.testExecution.logTestStep('should load the trained models page');
        await svlMl.navigation.security.navigateToTrainedModels();

        await ml.testExecution.logTestStep(
          'should display the stats bar and the analytics table with no trained models'
        );
        await ml.trainedModels.assertStats(0);
        await ml.trainedModelsTable.assertTableIsNotPopulated();
      });
    });
  });
}
