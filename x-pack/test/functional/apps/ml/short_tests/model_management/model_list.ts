/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultOnFailureConfiguration } from '@kbn/ml-plugin/public/application/components/ml_inference/state';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { SUPPORTED_TRAINED_MODELS } from '../../../../services/ml/api';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const trainedModels = Object.values(SUPPORTED_TRAINED_MODELS).map((model) => ({
    ...model,
    id: model.name,
  }));

  describe('trained models', function () {
    // 'Created at' will be different on each run,
    // so we will just assert that the value is in the expected timestamp format.
    const builtInModelData = {
      modelId: 'lang_ident_model_1',
      description: 'Model used for identifying language from arbitrary input text.',
      modelTypes: ['classification', 'built-in', 'lang_ident'],
    };

    const modelWithPipelineData = {
      modelId: 'dfa_classification_model_n_0',
      description: '',
      modelTypes: ['classification', 'tree_ensemble'],
    };

    const modelWithoutPipelineData = {
      modelId: 'dfa_regression_model_n_0',
      description: '',
      modelTypes: ['regression', 'tree_ensemble'],
    };

    const modelWithoutPipelineDataExpectedValues = {
      name: `ml-inference-${modelWithoutPipelineData.modelId}`,
      duplicateName: `ml-inference-${modelWithoutPipelineData.modelId}-duplicate`,
      description: `Uses the pre-trained data frame analytics model ${modelWithoutPipelineData.modelId} to infer against the data that is being ingested in the pipeline`,
      duplicateDescription: 'Edited description',
      inferenceConfig: {
        regression: {
          results_field: 'predicted_value',
          num_top_feature_importance_values: 0,
        },
      },
      inferenceConfigDuplicate: {
        regression: {
          results_field: 'predicted_value_for_duplicate',
          num_top_feature_importance_values: 0,
        },
      },
      editedInferenceConfig: {
        regression: {
          results_field: 'predicted_value_for_duplicate',
          num_top_feature_importance_values: 0,
        },
      },
      fieldMap: {},
      editedFieldMap: {
        incoming_field: 'old_field',
      },
    };

    before(async () => {
      for (const model of trainedModels) {
        await ml.api.importTrainedModel(model.id, model.name);
      }

      await ml.api.createTestTrainedModels('classification', 15, true);
      await ml.api.createTestTrainedModels('regression', 15);

      // Make sure the .ml-stats index is created in advance, see https://github.com/elastic/elasticsearch/issues/65846
      await ml.api.assureMlStatsIndexExists();
    });

    after(async () => {
      await ml.api.stopAllTrainedModelDeploymentsES();
      await ml.api.deleteAllTrainedModelsES();
      await ml.api.deleteIngestPipeline(modelWithoutPipelineDataExpectedValues.name, false);
      await ml.api.deleteIngestPipeline(
        modelWithoutPipelineDataExpectedValues.duplicateName,
        false
      );
      await ml.api.cleanMlIndices();
    });

    describe('for ML user with read-only access', () => {
      before(async () => {
        await ml.securityUI.loginAsMlViewer();
        await ml.navigation.navigateToTrainedModels();
        await ml.commonUI.waitForRefreshButtonEnabled();
      });

      after(async () => {
        await ml.securityUI.logout();
      });

      it('renders expanded row content correctly for model with pipelines', async () => {
        await ml.trainedModelsTable.ensureRowIsExpanded(modelWithPipelineData.modelId);
        await ml.trainedModelsTable.assertDetailsTabContent();
        await ml.trainedModelsTable.assertInferenceConfigTabContent();
        await ml.trainedModelsTable.assertStatsTabContent();
        await ml.trainedModelsTable.assertPipelinesTabContent(true, [
          { pipelineName: `pipeline_${modelWithPipelineData.modelId}`, expectDefinition: false },
        ]);
      });
    });

    describe('for ML power user', () => {
      before(async () => {
        await ml.securityUI.loginAsMlPowerUser();
        await ml.navigation.navigateToTrainedModels();
        await ml.commonUI.waitForRefreshButtonEnabled();
      });

      after(async () => {
        await ml.securityUI.logout();
      });

      it('renders trained models list', async () => {
        await ml.testExecution.logTestStep(
          'should display the stats bar with the total number of models'
        );
        // +1 because of the built-in model
        await ml.trainedModels.assertStats(37);

        await ml.testExecution.logTestStep('should display the table');
        await ml.trainedModels.assertTableExists();
        await ml.trainedModels.assertRowsNumberPerPage(10);
      });

      it('renders expanded row content correctly for model with pipelines', async () => {
        await ml.trainedModelsTable.ensureRowIsExpanded(modelWithPipelineData.modelId);
        await ml.trainedModelsTable.assertDetailsTabContent();
        await ml.trainedModelsTable.assertInferenceConfigTabContent();
        await ml.trainedModelsTable.assertStatsTabContent();
        await ml.trainedModelsTable.assertPipelinesTabContent(true, [
          { pipelineName: `pipeline_${modelWithPipelineData.modelId}`, expectDefinition: true },
        ]);
      });

      it('renders expanded row content correctly for model without pipelines', async () => {
        await ml.trainedModelsTable.ensureRowIsExpanded(modelWithoutPipelineData.modelId);
        await ml.trainedModelsTable.assertDetailsTabContent();
        await ml.trainedModelsTable.assertInferenceConfigTabContent();
        await ml.trainedModelsTable.assertStatsTabContent();
        await ml.trainedModelsTable.assertPipelinesTabContent(false);
      });

      it('deploys the trained model with default values', async () => {
        await ml.testExecution.logTestStep('should display the trained model in the table');
        await ml.trainedModelsTable.filterWithSearchString(modelWithoutPipelineData.modelId, 1);
        await ml.testExecution.logTestStep(
          'should not show collapsed actions menu for the model in the table'
        );
        await ml.trainedModelsTable.assertModelCollapsedActionsButtonExists(
          modelWithoutPipelineData.modelId,
          false
        );
        await ml.testExecution.logTestStep('should show deploy action for the model in the table');
        await ml.trainedModelsTable.assertModelDeployActionButtonExists(
          modelWithoutPipelineData.modelId,
          true
        );
        await ml.testExecution.logTestStep('should open the deploy model flyout');
        await ml.trainedModelsTable.openTrainedModelsInferenceFlyout(
          modelWithoutPipelineData.modelId
        );
        await ml.testExecution.logTestStep('should complete the deploy model Details step');
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutDetails({
          name: modelWithoutPipelineDataExpectedValues.name,
          description: modelWithoutPipelineDataExpectedValues.description,
          // If no metadata is provided, the target field will default to empty string
          targetField: '',
        });
        await ml.testExecution.logTestStep('should complete the deploy model Pipeline Config step');
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutPipelineConfig({
          inferenceConfig: modelWithoutPipelineDataExpectedValues.inferenceConfig,
          fieldMap: modelWithoutPipelineDataExpectedValues.fieldMap,
        });
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline On Failure step'
        );
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutOnFailure(
          getDefaultOnFailureConfiguration()
        );
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline Create pipeline step'
        );
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutCreateStep({
          description: modelWithoutPipelineDataExpectedValues.description,
          processors: [
            {
              inference: {
                model_id: modelWithoutPipelineData.modelId,
                ignore_failure: false,
                inference_config: modelWithoutPipelineDataExpectedValues.inferenceConfig,
                on_failure: getDefaultOnFailureConfiguration(),
              },
            },
          ],
        });
      });

      it('deploys the trained model with custom values', async () => {
        await ml.testExecution.logTestStep('should display the trained model in the table');
        await ml.trainedModelsTable.filterWithSearchString(modelWithoutPipelineData.modelId, 1);
        await ml.testExecution.logTestStep(
          'should not show collapsed actions menu for the model in the table'
        );
        await ml.trainedModelsTable.assertModelCollapsedActionsButtonExists(
          modelWithoutPipelineData.modelId,
          false
        );
        await ml.testExecution.logTestStep('should show deploy action for the model in the table');
        await ml.trainedModelsTable.assertModelDeployActionButtonExists(
          modelWithoutPipelineData.modelId,
          true
        );
        await ml.testExecution.logTestStep('should open the deploy model flyout');
        await ml.trainedModelsTable.openTrainedModelsInferenceFlyout(
          modelWithoutPipelineData.modelId
        );
        await ml.testExecution.logTestStep('should complete the deploy model Details step');
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutDetails(
          {
            name: modelWithoutPipelineDataExpectedValues.duplicateName,
            description: modelWithoutPipelineDataExpectedValues.duplicateDescription,
            targetField: 'myTargetField',
          },
          true
        );
        await ml.testExecution.logTestStep('should complete the deploy model Pipeline Config step');
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutPipelineConfig(
          {
            inferenceConfig: modelWithoutPipelineDataExpectedValues.inferenceConfig,
            editedInferenceConfig: modelWithoutPipelineDataExpectedValues.editedInferenceConfig,
            fieldMap: modelWithoutPipelineDataExpectedValues.fieldMap,
            editedFieldMap: modelWithoutPipelineDataExpectedValues.editedFieldMap,
          },
          true
        );
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline On Failure step'
        );
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutOnFailure(
          getDefaultOnFailureConfiguration(),
          true
        );
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline Create pipeline step'
        );
        await ml.trainedModelsFlyout.completeTrainedModelsInferenceFlyoutCreateStep({
          description: modelWithoutPipelineDataExpectedValues.duplicateDescription,
          processors: [
            {
              inference: {
                field_map: {
                  incoming_field: 'old_field',
                },
                ignore_failure: true,
                if: "ctx?.network?.name == 'Guest'",
                model_id: modelWithoutPipelineData.modelId,
                inference_config: modelWithoutPipelineDataExpectedValues.inferenceConfigDuplicate,
                tag: 'tag',
                target_field: 'myTargetField',
              },
            },
          ],
        });
      });

      it('displays the built-in model with only Test action enabled', async () => {
        await ml.testExecution.logTestStep('should display the model in the table');
        await ml.trainedModelsTable.filterWithSearchString(builtInModelData.modelId, 1);

        await ml.testExecution.logTestStep(
          'displays expected row values for the model in the table'
        );
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

        await ml.testExecution.logTestStep('should have enabled the button that opens Test flyout');
        await ml.trainedModelsTable.assertModelTestButtonExists(builtInModelData.modelId, true);

        await ml.trainedModelsTable.testModel(
          'lang_ident',
          builtInModelData.modelId,
          {
            inputText: 'Goedemorgen! Ik ben een appel.',
          },
          {
            title: 'This looks like Dutch,Flemish',
            topLang: { code: 'nl', minProbability: 0.9 },
          }
        );
      });

      it('displays a model with an ingest pipeline and model can be deleted with associated ingest pipelines', async () => {
        await ml.testExecution.logTestStep('should display the model in the table');
        await ml.trainedModelsTable.filterWithSearchString(modelWithPipelineData.modelId, 1);

        await ml.testExecution.logTestStep(
          'displays expected row values for the model in the table'
        );
        await ml.trainedModelsTable.assertModelsRowFields(modelWithPipelineData.modelId, {
          id: modelWithPipelineData.modelId,
          description: modelWithPipelineData.description,
          modelTypes: modelWithPipelineData.modelTypes,
        });

        await ml.testExecution.logTestStep(
          'should show enabled delete action for the model in the table'
        );

        await ml.trainedModelsTable.assertModelDeleteActionButtonEnabled(
          modelWithPipelineData.modelId,
          true
        );

        await ml.testExecution.logTestStep('should show the delete modal');
        await ml.trainedModelsTable.clickDeleteAction(modelWithPipelineData.modelId);

        await ml.testExecution.logTestStep('should delete the model with pipelines');
        await ml.trainedModelsTable.confirmDeleteModel(true);
        await ml.trainedModelsTable.assertModelDisplayedInTable(
          modelWithPipelineData.modelId,
          false
        );
      });

      it('displays a model without an ingest pipeline and model can be deleted', async () => {
        await ml.testExecution.logTestStep('should display the model in the table');
        await ml.trainedModelsTable.filterWithSearchString(modelWithoutPipelineData.modelId, 1);

        await ml.testExecution.logTestStep(
          'displays expected row values for the model in the table'
        );
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

      describe('with imported models', function () {
        for (const model of trainedModels) {
          it(`renders expanded row content correctly for imported tiny model ${model.id} without pipelines`, async () => {
            await ml.trainedModelsTable.ensureRowIsExpanded(model.id);
            await ml.trainedModelsTable.assertDetailsTabContent();
            await ml.trainedModelsTable.assertInferenceConfigTabContent();
            await ml.trainedModelsTable.assertStatsTabContent();
            await ml.trainedModelsTable.assertPipelinesTabContent(false);
          });

          it(`starts deployment of the imported model ${model.id}`, async () => {
            await ml.trainedModelsTable.startDeploymentWithParams(model.id, {
              priority: 'normal',
              numOfAllocations: 1,
              threadsPerAllocation: 2,
            });
            await ml.trainedModelsTable.assertModelDeleteActionButtonEnabled(model.id, false);
          });

          it(`stops deployment of the imported model ${model.id}`, async () => {
            await ml.trainedModelsTable.stopDeployment(model.id);
            await ml.trainedModelsTable.assertModelDeleteActionButtonEnabled(model.id, true);
          });

          it(`deletes the imported model ${model.id}`, async () => {
            await ml.trainedModelsTable.deleteModel(model.id);
          });
        }
      });
    });
  });
}
