/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const a11y = getService('a11y');
  const ml = getService('ml');

  const testModelId = 'lang_ident_model_1';

  describe('machine learning trained models page Accessibility', function () {
    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
      await ml.api.createIngestPipeline(testModelId);
      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToTrainedModels();
    });

    after(async () => {
      await ml.api.deleteIngestPipeline(testModelId);

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
      await ml.securityUI.logout();
    });

    it('trained models list', async () => {
      await a11y.testAppSnapshot();
    });

    it('trained model details', async () => {
      await ml.trainedModelsTable.ensureRowIsExpanded(testModelId);
      await a11y.testAppSnapshot();

      await ml.testExecution.logTestStep('Assert the Details tab content');
      await ml.trainedModelsTable.assertDetailsTabContent();
      await a11y.testAppSnapshot();

      await ml.testExecution.logTestStep('Assert the Models Map tab content');
      await ml.trainedModelsTable.assertModelsMapTabContent();
      await a11y.testAppSnapshot();

      await ml.testExecution.logTestStep('Assert the Inference Config tab content');
      await ml.trainedModelsTable.assertInferenceConfigTabContent();
      await a11y.testAppSnapshot();

      await ml.testExecution.logTestStep('Assert the Stats tab content');
      await ml.trainedModelsTable.assertStatsTabContent();
      await a11y.testAppSnapshot();

      await ml.testExecution.logTestStep('Assert the Pipelines tab content');
      await ml.trainedModelsTable.assertPipelinesTabContent();
      await a11y.testAppSnapshot();
    });

    it('add trained model flyout', async () => {
      await ml.trainedModelsFlyout.open();
      await a11y.testAppSnapshot();

      await ml.trainedModelsFlyout.changeTab('manualDownload');
      await a11y.testAppSnapshot();
    });
  });
}
