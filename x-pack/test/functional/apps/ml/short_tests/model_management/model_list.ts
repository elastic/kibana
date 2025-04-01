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

  const modelAllSpaces = SUPPORTED_TRAINED_MODELS.TINY_ELSER;

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

    const modelWithPipelineAndDestIndex = {
      modelId: 'dfa_regression_model_n_1',
      description: '',
      modelTypes: ['regression', 'tree_ensemble'],
    };
    const modelWithPipelineAndDestIndexExpectedValues = {
      dataViewTitle: `user-index_${modelWithPipelineAndDestIndex.modelId}`,
      index: `user-index_${modelWithPipelineAndDestIndex.modelId}`,
      name: `ml-inference-${modelWithPipelineAndDestIndex.modelId}`,
      description: '',
      inferenceConfig: {
        regression: {
          results_field: 'predicted_value',
          num_top_feature_importance_values: 0,
        },
      },
      fieldMap: {},
    };

    before(async () => {
      for (const model of trainedModels) {
        await ml.api.importTrainedModel(model.id, model.name);
      }

      // Assign model to all spaces
      await ml.api.updateTrainedModelSpaces(modelAllSpaces.name, ['*'], ['default']);
      await ml.api.assertTrainedModelSpaces(modelAllSpaces.name, ['*']);

      await ml.api.createTestTrainedModels('classification', 15, true);
      await ml.api.createTestTrainedModels('regression', 15);

      // Make sure the .ml-stats index is created in advance, see https://github.com/elastic/elasticsearch/issues/65846
      await ml.api.assureMlStatsIndexExists();

      // Create ingest pipeline and destination index that's tied to model
      await ml.api.createIngestPipeline(modelWithPipelineAndDestIndex.modelId);
      await ml.api.createIndex(modelWithPipelineAndDestIndexExpectedValues.index, undefined, {
        index: { default_pipeline: `pipeline_${modelWithPipelineAndDestIndex.modelId}` },
      });
    });

    after(async () => {
      await ml.api.stopAllTrainedModelDeploymentsES();
      await ml.api.deleteAllTrainedModelsES();

      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices(modelWithPipelineAndDestIndexExpectedValues.index);

      // Need to delete index before ingest pipeline, else it will give error
      await ml.api.deleteIngestPipeline(modelWithPipelineAndDestIndex.modelId);
      await ml.testResources.deleteDataViewByTitle(
        modelWithPipelineAndDestIndexExpectedValues.dataViewTitle
      );
      // Delete pipelines from deploy DFA model tests
      await ml.api.deleteIngestPipeline(modelWithoutPipelineDataExpectedValues.name, false);
      await ml.api.deleteIngestPipeline(
        modelWithoutPipelineDataExpectedValues.duplicateName,
        false
      );
    });

    describe('for ML user with read-only access', () => {
      before(async () => {
        await ml.securityUI.loginAsMlViewer();
        await ml.navigation.navigateToTrainedModels();
        await ml.commonUI.waitForRefreshButtonEnabled();
        await ml.trainedModels.showAllModels();
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

      it('the add trained model flyout should display elements on Manual Download tab correctly', async () => {
        await ml.testExecution.logTestStep('Open the Add Trained Model Flyout');
        await ml.trainedModelsFlyout.open();

        await ml.testExecution.logTestStep('Assert the Manual Download tab exists');
        await ml.trainedModelsFlyout.assertFlyoutTabs(['manualDownload']);

        await ml.testExecution.logTestStep('Assert all eland code blocks exist within the flyout');
        await ml.trainedModelsFlyout.assertElandPythonClientCodeBlocks();

        await ml.testExecution.logTestStep('Close the Add Trained Model flyout');
        await ml.trainedModelsFlyout.close();
      });
    });

    describe('for ML power user', () => {
      before(async () => {
        await ml.securityUI.loginAsMlPowerUser();
        await ml.navigation.navigateToTrainedModels();
        await ml.commonUI.waitForRefreshButtonEnabled();
        await ml.trainedModels.showAllModels();
      });

      after(async () => {
        await ml.securityUI.logout();
      });

      it.skip('should not be able to delete a model assigned to all spaces, and show a warning copy explaining the situation', async () => {
        await ml.testExecution.logTestStep('should select a model');
        await ml.trainedModelsTable.filterWithSearchString(modelAllSpaces.name, 1);
        await ml.trainedModels.selectModel(modelAllSpaces.name);

        await ml.testExecution.logTestStep('should attempt to delete the model');
        await ml.trainedModels.clickBulkDelete();

        await ml.testExecution.logTestStep('assert the action is banned');
        await ml.trainedModelsTable.assertSpaceAwareWarningMessage();

        await ml.testExecution.logTestStep('close the eui modal');
        await ml.trainedModels.closeCheckingSpacePermissionsModal();
      });

      it('renders trained models list', async () => {
        await ml.testExecution.logTestStep(
          'should display the stats bar with the total number of models'
        );
        // +1 because of the built-in model
        await ml.trainedModels.assertStats(38);

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

      it('deploys the DFA trained model with default values', async () => {
        await ml.testExecution.logTestStep('should display the trained model in the table');
        await ml.trainedModelsTable.filterWithSearchString(modelWithoutPipelineData.modelId, 1);
        await ml.testExecution.logTestStep(
          'should show collapsed actions menu for the model in the table'
        );
        await ml.trainedModelsTable.assertModelCollapsedActionsButtonExists(
          modelWithoutPipelineData.modelId,
          true
        );
        await ml.testExecution.logTestStep('should show deploy action for the model in the table');
        await ml.trainedModelsTable.assertModelDeployActionButtonEnabled(
          modelWithoutPipelineData.modelId,
          true
        );
        await ml.testExecution.logTestStep('should open the deploy model flyout');
        await ml.trainedModelsTable.clickDeployAction(modelWithoutPipelineData.modelId);
        await ml.testExecution.logTestStep('should complete the deploy model Details step');
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutDetails({
          name: modelWithoutPipelineDataExpectedValues.name,
          description: modelWithoutPipelineDataExpectedValues.description,
          // If no metadata is provided, the target field will default to empty string
          targetField: '',
        });
        await ml.testExecution.logTestStep('should complete the deploy model Pipeline Config step');
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutPipelineConfig({
          inferenceConfig: modelWithoutPipelineDataExpectedValues.inferenceConfig,
          fieldMap: modelWithoutPipelineDataExpectedValues.fieldMap,
        });
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline On Failure step'
        );
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutOnFailure(
          getDefaultOnFailureConfiguration()
        );
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline Create pipeline step'
        );
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutCreateStep({
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

      it('deploys the DFA trained model with custom values', async () => {
        await ml.testExecution.logTestStep('should display the trained model in the table');
        await ml.trainedModelsTable.filterWithSearchString(modelWithoutPipelineData.modelId, 1);
        await ml.testExecution.logTestStep(
          'should not show collapsed actions menu for the model in the table'
        );
        await ml.trainedModelsTable.assertModelCollapsedActionsButtonExists(
          modelWithoutPipelineData.modelId,
          true
        );
        await ml.testExecution.logTestStep('should show deploy action for the model in the table');
        await ml.trainedModelsTable.assertModelDeployActionButtonExists(
          modelWithoutPipelineData.modelId,
          false
        );
        await ml.testExecution.logTestStep('should open the deploy model flyout');
        await ml.trainedModelsTable.clickDeployAction(modelWithoutPipelineData.modelId);
        await ml.testExecution.logTestStep('should complete the deploy model Details step');
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutDetails(
          {
            name: modelWithoutPipelineDataExpectedValues.duplicateName,
            description: modelWithoutPipelineDataExpectedValues.duplicateDescription,
            targetField: 'myTargetField',
          },
          true
        );
        await ml.testExecution.logTestStep('should complete the deploy model Pipeline Config step');
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutPipelineConfig(
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
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutOnFailure(
          getDefaultOnFailureConfiguration(),
          true
        );
        await ml.testExecution.logTestStep(
          'should complete the deploy model pipeline Create pipeline step'
        );
        await ml.deployDFAModelFlyout.completeTrainedModelsInferenceFlyoutCreateStep({
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
        await ml.testExecution.logTestStep('expands the row to show the model details');
        await ml.trainedModelsTable.ensureRowIsExpanded(modelWithoutPipelineData.modelId);

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

      it.skip('navigates to data drift', async () => {
        await ml.testExecution.logTestStep('should show the model map in the expanded row');
        await ml.trainedModelsTable.ensureRowIsExpanded(modelWithPipelineAndDestIndex.modelId);
        await ml.trainedModelsTable.assertModelsMapTabContent();

        await ml.testExecution.logTestStep(
          'should navigate to data drift index pattern creation page'
        );

        await ml.trainedModelsTable.assertAnalyzeDataDriftActionButtonEnabled(
          modelWithPipelineAndDestIndex.modelId,
          true
        );
        await ml.trainedModelsTable.clickAnalyzeDataDriftActionButton(
          modelWithPipelineAndDestIndex.modelId
        );

        await ml.testExecution.logTestStep(`sets index pattern for reference data set`);
        await ml.dataDrift.setIndexPatternInput(
          'reference',
          `${modelWithPipelineAndDestIndexExpectedValues.index}*`
        );
        await ml.dataDrift.assertIndexPatternInput(
          'comparison',
          modelWithPipelineAndDestIndexExpectedValues.index
        );

        await ml.testExecution.logTestStep(`redirects to data drift page`);
        await ml.trainedModelsTable.clickAnalyzeDataDriftWithoutSaving();
        await ml.navigation.navigateToTrainedModels();
      });

      describe('with imported models', function () {
        before(async () => {
          await ml.navigation.navigateToTrainedModels();
        });

        for (const model of trainedModels) {
          it(`renders expanded row content correctly for imported tiny model ${model.id} without pipelines`, async () => {
            await ml.trainedModelsTable.ensureRowIsExpanded(model.id);
            await ml.trainedModelsTable.assertDetailsTabContent();
            await ml.trainedModelsTable.assertInferenceConfigTabContent();
            await ml.trainedModelsTable.assertStatsTabContent();
            await ml.trainedModelsTable.assertPipelinesTabContent(false);
          });
        }

        describe('supports actions for an imported model', function () {
          // It's enough to test the actions for one model
          const model = trainedModels[trainedModels.length - 1];

          it(`starts deployment of the imported model ${model.id}`, async () => {
            await ml.trainedModelsTable.startDeploymentWithParams(model.id, {
              vCPULevel: 'medium',
              optimized: 'optimizedForSearch',
              adaptiveResources: false,
            });
            await ml.trainedModelsTable.assertModelDeleteActionButtonEnabled(model.id, false);
          });

          it(`stops deployment of the imported model ${model.id}`, async () => {
            // Wait for the model to be deployed before stopping it.
            await ml.testExecution.logTestStep('should have a Deployed state');
            await ml.trainedModelsTable.assertModelState(model.id, 'Deployed');
            await ml.trainedModelsTable.stopDeployment(model.id);
          });

          it(`deletes the imported model ${model.id}`, async () => {
            await ml.trainedModelsTable.deleteModel(model.id);
          });
        });
      });
    });

    describe('add trained model flyout for ML power user', () => {
      before(async () => {
        await ml.securityUI.loginAsMlPowerUser();
        await ml.navigation.navigateToTrainedModels();
        await ml.commonUI.waitForRefreshButtonEnabled();

        await ml.testExecution.logTestStep('Open the Add Trained Model Flyout');
        await ml.trainedModelsFlyout.open();
      });

      after(async () => {
        await ml.testExecution.logTestStep('Close the Add Trained Model flyout');
        await ml.trainedModelsFlyout.close();

        await ml.securityUI.logout();
      });

      it('should contain a Click to Download and a Manual Download tab', async () => {
        await ml.testExecution.logTestStep(
          'Assert the "Click to Download" and "Manual Download" tabs exists'
        );
        await ml.trainedModelsFlyout.assertFlyoutTabs(['clickToDownload', 'manualDownload']);
      });

      it('should list Elser and E5 panels contents correctly', async () => {
        await ml.testExecution.logTestStep('should display the Elser header copy');
        await ml.trainedModelsFlyout.assertElserModelHeaderCopy();

        await ml.testExecution.logTestStep('should display the Elser Panels');
        await ml.trainedModelsFlyout.assertElserPanelsExist();

        await ml.testExecution.logTestStep('should display the E5 Panels');
        await ml.trainedModelsFlyout.assertE5PanelsExist();

        await ml.testExecution.logTestStep('should display a Download Button');
        await ml.trainedModelsFlyout.assertDownloadButtonExists();
      });
    });
  });
}
