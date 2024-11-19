/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IngestInferenceProcessor, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { ProvidedType } from '@kbn/test';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { MlCommonUI } from './common_ui';

export interface TrainedModelRowData {
  id: string;
  description: string;
  modelTypes: string[];
}

export type MlDeployTrainedModelsFlyout = ProvidedType<typeof DeployDFAModelFlyoutProvider>;

export function DeployDFAModelFlyoutProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  return new (class DeployTrainedModelsFlyout {
    public async setTrainedModelsInferenceFlyoutCustomValue(target: string, customValue: string) {
      await mlCommonUI.setValueWithChecks(target, customValue, {
        clearWithKeyboard: true,
      });
    }

    public async setTrainedModelsInferenceFlyoutCustomDetails(values: {
      name: string;
      description: string;
      targetField: string;
    }) {
      await this.setTrainedModelsInferenceFlyoutCustomValue(
        'mlTrainedModelsInferencePipelineNameInput',
        values.name
      );
      await this.setTrainedModelsInferenceFlyoutCustomValue(
        'mlTrainedModelsInferencePipelineDescriptionInput',
        values.description
      );
      await this.setTrainedModelsInferenceFlyoutCustomValue(
        'mlTrainedModelsInferencePipelineTargetFieldInput',
        values.targetField
      );
    }

    public async assertTrainedModelsInferenceFlyoutAdditionalSettings(
      condition?: string,
      tag?: string
    ) {
      if (condition || tag) {
        await this.trainedModelsInferenceOpenAdditionalSettings();
        const actualCondition = await testSubjects.getAttribute(
          'mlTrainedModelsInferenceAdvancedSettingsConditionTextArea',
          'value'
        );
        expect(actualCondition).to.eql(condition);
        const actualTag = await testSubjects.getAttribute(
          'mlTrainedModelsInferenceAdvancedSettingsTagInput',
          'value'
        );
        expect(actualTag).to.eql(tag);
      }
    }

    public async assertTrainedModelsInferenceFlyoutPipelineConfigValues(
      inferenceConfig: IngestInferenceProcessor['inference_config'],
      fieldMap: IngestInferenceProcessor['field_map']
    ) {
      await retry.tryForTime(5000, async () => {
        const actualInferenceConfig = await testSubjects.getVisibleText(
          'mlTrainedModelsInferencePipelineInferenceConfigBlock'
        );
        expect(JSON.parse(actualInferenceConfig)).to.eql(inferenceConfig);
      });

      await retry.tryForTime(5000, async () => {
        const actualFieldMap = await testSubjects.getVisibleText(
          'mlTrainedModelsInferencePipelineFieldMapBlock'
        );
        expect(JSON.parse(actualFieldMap)).to.eql(fieldMap);
      });
    }

    public async trainedModelsInferenceFlyoutSaveChanges() {
      await testSubjects.existOrFail('mlTrainedModelsInferencePipelineFlyoutSaveChangesButton');
      const saveChangesButton = await testSubjects.find(
        'mlTrainedModelsInferencePipelineFlyoutSaveChangesButton'
      );
      await saveChangesButton.click();
    }

    public async clearTrainedModelsInferenceFlyoutCustomEditorValues(
      selector: string,
      defaultValue?: string
    ) {
      const configElement = await testSubjects.find(selector);
      const editor = await configElement.findByClassName('kibanaCodeEditor');
      await editor.click();
      const input = await find.activeElement();
      // check default value then clear
      const editorContent = await input.getAttribute('value');
      if (defaultValue !== undefined) {
        expect(editorContent).to.contain(defaultValue);
      }
      await input.clearValueWithKeyboard();
      // Ensure the editor is cleared
      const editorContentAfterClearing = await input.getAttribute('value');
      expect(editorContentAfterClearing).to.eql('');
    }

    public async setTrainedModelsInferenceFlyoutCustomEditorValues(
      selector: string,
      value: string
    ) {
      const configElement = await testSubjects.find(selector);
      const editor = await configElement.findByClassName('kibanaCodeEditor');
      await editor.click();
      const input = await find.activeElement();

      for (const chr of value) {
        await retry.tryForTime(5000, async () => {
          await input.type(chr, { charByChar: true });
        });
      }
    }

    public async setTrainedModelsInferenceFlyoutCustomPipelineConfig(values: {
      condition: string;
      editedInferenceConfig: IngestInferenceProcessor['inference_config'];
      editedFieldMap: IngestInferenceProcessor['field_map'];
      tag: string;
    }) {
      // INFERENCE CONFIG
      const editInferenceConfigButton = await testSubjects.find(
        'mlTrainedModelsInferencePipelineInferenceConfigEditButton'
      );
      await editInferenceConfigButton.click();
      await this.clearTrainedModelsInferenceFlyoutCustomEditorValues(
        'mlTrainedModelsInferencePipelineInferenceConfigEditor'
      );
      await this.setTrainedModelsInferenceFlyoutCustomEditorValues(
        'mlTrainedModelsInferencePipelineInferenceConfigEditor',
        JSON.stringify(values.editedInferenceConfig)
      );
      await this.trainedModelsInferenceFlyoutSaveChanges();
      // FIELD MAP
      const editFieldMapButton = await testSubjects.find(
        'mlTrainedModelsInferencePipelineFieldMapEditButton'
      );
      await editFieldMapButton.click();
      await this.clearTrainedModelsInferenceFlyoutCustomEditorValues(
        'mlTrainedModelsInferencePipelineFieldMapEdit',
        '{\n  "field_map": {\n    "incoming_field": "field_the_model_expects"\n  }\n'
      );

      await this.setTrainedModelsInferenceFlyoutCustomEditorValues(
        'mlTrainedModelsInferencePipelineFieldMapEdit',
        JSON.stringify(values.editedFieldMap)
      );
      await this.trainedModelsInferenceFlyoutSaveChanges();
      // OPEN ADVANCED SETTINGS
      await this.trainedModelsInferenceOpenAdditionalSettings();
      await this.setTrainedModelsInferenceFlyoutCustomValue(
        'mlTrainedModelsInferenceAdvancedSettingsConditionTextArea',
        values.condition
      );
      await this.setTrainedModelsInferenceFlyoutCustomValue(
        'mlTrainedModelsInferenceAdvancedSettingsTagInput',
        values.tag
      );
      await this.trainedModelsInferenceFlyoutSaveChanges();

      await this.assertTrainedModelsInferenceFlyoutPipelineConfigValues(
        values.editedInferenceConfig,
        values.editedFieldMap
      );
      await this.assertTrainedModelsInferenceFlyoutAdditionalSettings(values.condition, values.tag);
    }

    public async completeTrainedModelsInferenceFlyoutDetails(
      expectedValues: {
        name: string;
        description: string;
        targetField: string;
      },
      editDefaults: boolean = false
    ) {
      if (editDefaults) {
        await this.setTrainedModelsInferenceFlyoutCustomDetails(expectedValues);
      }
      const name = await testSubjects.getAttribute(
        'mlTrainedModelsInferencePipelineNameInput',
        'value'
      );
      expect(name).to.eql(expectedValues.name);
      const description = await testSubjects.getAttribute(
        'mlTrainedModelsInferencePipelineDescriptionInput',
        'value'
      );
      expect(description).to.eql(expectedValues.description);
      const targetField = await testSubjects.getAttribute(
        'mlTrainedModelsInferencePipelineTargetFieldInput',
        'value'
      );
      expect(targetField).to.eql(expectedValues.targetField);
      await this.deployModelsContinue('mlTrainedModelsInferencePipelineProcessorConfigStep');
    }

    public async trainedModelsInferenceOpenAdditionalSettings() {
      await testSubjects.existOrFail('mlTrainedModelsInferenceAdvancedSettingsAccordion');
      await testSubjects.click('mlTrainedModelsInferenceAdvancedSettingsAccordionButton');
      await testSubjects.existOrFail('mlTrainedModelsInferenceAdvancedSettingsConditionTextArea');
      await testSubjects.existOrFail('mlTrainedModelsInferenceAdvancedSettingsTagInput');
    }

    public async completeTrainedModelsInferenceFlyoutPipelineConfig(
      expectedValues: {
        inferenceConfig: IngestInferenceProcessor['inference_config'];
        editedInferenceConfig?: IngestInferenceProcessor['inference_config'];
        fieldMap: IngestInferenceProcessor['field_map'];
        editedFieldMap?: IngestInferenceProcessor['field_map'];
      },
      editDefaults: boolean = false
    ) {
      const { inferenceConfig, editedInferenceConfig, fieldMap, editedFieldMap } = expectedValues;
      // Check all defaults
      await this.assertTrainedModelsInferenceFlyoutPipelineConfigValues(inferenceConfig, fieldMap);

      if (editDefaults) {
        await this.setTrainedModelsInferenceFlyoutCustomPipelineConfig({
          condition: "ctx?.network?.name == 'Guest'",
          editedFieldMap,
          editedInferenceConfig,
          tag: 'tag',
        });
      }

      await this.deployModelsContinue('mlTrainedModelsInferenceOnFailureStep');
    }

    public async completeTrainedModelsInferenceFlyoutOnFailure(
      expectedOnFailure: IngestInferenceProcessor['on_failure'],
      editDefaults: boolean = false
    ) {
      await retry.tryForTime(30 * 1000, async () => {
        // Switch should default to unchecked
        const ignoreFailureSelected =
          (await testSubjects.getAttribute(
            'mlTrainedModelsInferenceIgnoreFailureSwitch',
            'aria-checked'
          )) === 'true';
        expect(ignoreFailureSelected).to.eql(false);
        // Switch should default to checked
        const takeActionOnFailureSelected =
          (await testSubjects.getAttribute(
            'mlTrainedModelsInferenceTakeActionOnFailureSwitch',
            'aria-checked'
          )) === 'true';
        expect(takeActionOnFailureSelected).to.eql(true);
      });

      const defaultOnFailure = await testSubjects.getVisibleText(
        'mlTrainedModelsInferenceOnFailureCodeBlock'
      );
      expect(JSON.parse(defaultOnFailure)).to.eql(expectedOnFailure);

      if (editDefaults) {
        await retry.tryForTime(30 * 1000, async () => {
          // switch ignore failure to true
          await testSubjects.click('mlTrainedModelsInferenceIgnoreFailureSwitch');
          // Switch should now be checked
          const isIgnoreFailureSelected =
            (await testSubjects.getAttribute(
              'mlTrainedModelsInferenceIgnoreFailureSwitch',
              'aria-checked'
            )) === 'true';
          expect(isIgnoreFailureSelected).to.eql(true);
        });
      }
      await this.deployModelsContinue('mlTrainedModelsInferenceTestStep');
      // skip test step
      await this.deployModelsContinue('mlTrainedModelsInferenceReviewAndCreateStep');
    }

    public async completeTrainedModelsInferenceFlyoutCreateStep(expectedConfig: IngestPipeline) {
      const pipelineConfig = await testSubjects.getVisibleText(
        'mlTrainedModelsInferenceReviewAndCreateStepConfigBlock'
      );
      expect(JSON.parse(pipelineConfig)).to.eql(expectedConfig);
      await this.assertDeployModelsCreateButton();
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('mlTrainedModelsInferenceReviewAndCreateStepSuccessCallout');
      });
      const closeButton = await testSubjects.find('mlTrainedModelsInferencePipelineCloseButton');
      await closeButton.click();
    }

    public async deployModelsContinue(expectedStep?: string) {
      await testSubjects.existOrFail('mlTrainedModelsInferencePipelineContinueButton');
      await testSubjects.click('mlTrainedModelsInferencePipelineContinueButton');
      if (expectedStep) {
        await testSubjects.existOrFail(expectedStep);
      }
    }

    public async assertDeployModelsCreateButton(expectedStep?: string) {
      await testSubjects.existOrFail('mlTrainedModelsInferencePipelineCreateButton');
      await testSubjects.click('mlTrainedModelsInferencePipelineCreateButton');
    }
  })();
}
