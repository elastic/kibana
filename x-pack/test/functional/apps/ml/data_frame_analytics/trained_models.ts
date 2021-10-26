/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  describe('trained models', function () {
    before(async () => {
      await ml.trainedModels.createTestTrainedModels('classification', 15, true);
      await ml.trainedModels.createTestTrainedModels('regression', 15);
      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToTrainedModels();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    // 'Created at' will be different on each run,
    // so we will just assert that the value is in the expected timestamp format.
    const builtInModelData = {
      modelId: 'lang_ident_model_1',
      description: 'Model used for identifying language from arbitrary input text.',
      modelTypes: ['classification', 'built-in'],
    };

    const modelWithPipelineData = {
      modelId: 'dfa_classification_model_n_0',
      description: '',
      modelTypes: ['classification'],
    };

    const modelWithoutPipelineData = {
      modelId: 'dfa_regression_model_n_0',
      description: '',
      modelTypes: ['regression'],
    };

    it('renders trained models list', async () => {
      await ml.testExecution.logTestStep(
        'should display the stats bar with the total number of models'
      );
      // +1 because of the built-in model
      await ml.trainedModels.assertStats(31);

      await ml.testExecution.logTestStep('should display the table');
      await ml.trainedModels.assertTableExists();
      await ml.trainedModels.assertRowsNumberPerPage(10);
    });

    it('displays the built-in model and no actions are enabled', async () => {
      await ml.testExecution.logTestStep('should display the model in the table');
      await ml.trainedModelsTable.filterWithSearchString(builtInModelData.modelId, 1);

      await ml.testExecution.logTestStep('displays expected row values for the model in the table');
      await ml.trainedModelsTable.assertModelsRowFields(builtInModelData.modelId, {
        id: builtInModelData.modelId,
        description: builtInModelData.description,
        modelTypes: builtInModelData.modelTypes,
      });

      await ml.testExecution.logTestStep(
        'should not show collapsed actions menu for the model in the table'
      );
      await ml.trainedModelsTable.assertModelCollapsedActionsButtonExists(
        builtInModelData.modelId,
        false
      );

      await ml.testExecution.logTestStep(
        'should not show delete action for the model in the table'
      );
      await ml.trainedModelsTable.assertModelDeleteActionButtonExists(
        builtInModelData.modelId,
        false
      );
    });

    it('displays a model with an ingest pipeline and delete action is disabled', async () => {
      await ml.testExecution.logTestStep('should display the model in the table');
      await ml.trainedModelsTable.filterWithSearchString(modelWithPipelineData.modelId, 1);

      await ml.testExecution.logTestStep('displays expected row values for the model in the table');
      await ml.trainedModelsTable.assertModelsRowFields(modelWithPipelineData.modelId, {
        id: modelWithPipelineData.modelId,
        description: modelWithPipelineData.description,
        modelTypes: modelWithPipelineData.modelTypes,
      });

      await ml.testExecution.logTestStep(
        'should show disabled delete action for the model in the table'
      );

      await ml.trainedModelsTable.assertModelDeleteActionButtonEnabled(
        modelWithPipelineData.modelId,
        false
      );
    });

    it('displays a model without an ingest pipeline and model can be deleted', async () => {
      await ml.testExecution.logTestStep('should display the model in the table');
      await ml.trainedModelsTable.filterWithSearchString(modelWithoutPipelineData.modelId, 1);

      await ml.testExecution.logTestStep('displays expected row values for the model in the table');
      await ml.trainedModelsTable.assertModelsRowFields(modelWithoutPipelineData.modelId, {
        id: modelWithoutPipelineData.modelId,
        description: modelWithoutPipelineData.description,
        modelTypes: modelWithoutPipelineData.modelTypes,
      });

      await ml.testExecution.logTestStep(
        'should show enabled delete action for the model in the table'
      );

      await ml.trainedModelsTable.assertModelDeleteActionButtonEnabled(
        modelWithoutPipelineData.modelId,
        true
      );

      await ml.testExecution.logTestStep('should show the delete modal');
      await ml.trainedModelsTable.clickDeleteAction(modelWithoutPipelineData.modelId);

      await ml.testExecution.logTestStep('should delete the model');
      await ml.trainedModelsTable.confirmDeleteModel();
      await ml.trainedModelsTable.assertModelDisplayedInTable(
        modelWithoutPipelineData.modelId,
        false
      );
    });
  });
}
