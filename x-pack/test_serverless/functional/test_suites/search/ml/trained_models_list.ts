/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const PageObjects = getPageObjects(['svlCommonPage']);

  describe('Trained models list', () => {
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

        await ml.testExecution.logTestStep(
          'should display the stats bar and the analytics table with 1 installed trained model and built in elser models in the table'
        );
        await ml.trainedModels.assertStats(1);
        await ml.trainedModelsTable.assertTableIsPopulated();
      });
    });
  });
}
