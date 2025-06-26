/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexViewLogic } from '../../index_view_logic';

import { EMPTY_PIPELINE_CONFIGURATION, MLInferenceLogic } from './ml_inference_logic';
import { ModelSelect } from './model_select';
import { ModelSelectLogic } from './model_select_logic';
import { PipelineSelect } from './pipeline_select';

const CREATE_NEW_TAB_NAME = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.tabs.createNew.name',
  { defaultMessage: 'Create new' }
);

const USE_EXISTING_TAB_NAME = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.tabs.useExisting.name',
  { defaultMessage: 'Use existing' }
);

export enum ConfigurePipelineTabId {
  CREATE_NEW = 'create_new',
  USE_EXISTING = 'use_existing',
}

export const ConfigurePipeline: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    formErrors,
  } = useValues(MLInferenceLogic);
  const { setInferencePipelineConfiguration } = useActions(MLInferenceLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { modelStateChangeError } = useValues(ModelSelectLogic);

  const { existingPipeline, pipelineName } = configuration;

  const nameError = formErrors.pipelineName !== undefined && pipelineName.length > 0;

  const inputsDisabled = configuration.existingPipeline !== false;

  const tabs: EuiTabbedContentTab[] = [
    {
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiForm component="form">
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.nameLabel',
                {
                  defaultMessage: 'Name',
                }
              )}
              helpText={
                !nameError && (
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.name.helpText',
                      {
                        defaultMessage:
                          'Pipeline names are unique within a deployment and can only contain letters, numbers, underscores, and hyphens. This will create a pipeline named {pipelineName}.',
                        values: {
                          pipelineName: `ml-inference-${pipelineName}`,
                        },
                      }
                    )}
                  </EuiText>
                )
              }
              error={nameError && formErrors.pipelineName}
              isInvalid={nameError}
            >
              <EuiFieldText
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-uniqueName`}
                disabled={inputsDisabled}
                fullWidth
                prepend="ml-inference-"
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.namePlaceholder',
                  {
                    defaultMessage: 'Enter a unique name for this pipeline',
                  }
                )}
                value={pipelineName}
                onChange={(e) =>
                  setInferencePipelineConfiguration({
                    ...configuration,
                    isPipelineNameUserSupplied: e.target.value.length > 0,
                    pipelineName: e.target.value,
                  })
                }
              />
            </EuiFormRow>
            {modelStateChangeError && (
              <>
                <EuiSpacer />
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.modelStateChangeError.title',
                    { defaultMessage: 'Error changing model state' }
                  )}
                  color="danger"
                  iconType="error"
                >
                  {modelStateChangeError}
                </EuiCallOut>
                <EuiSpacer />
              </>
            )}
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.titleSelectTrainedModel',
                { defaultMessage: 'Select a trained ML Model' }
              )}
            >
              <ModelSelect />
            </EuiFormRow>
          </EuiForm>
        </>
      ),
      id: ConfigurePipelineTabId.CREATE_NEW,
      name: CREATE_NEW_TAB_NAME,
    },
    {
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiForm component="form">
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipelineLabel',
                {
                  defaultMessage: 'Select an existing inference pipeline',
                }
              )}
            >
              <PipelineSelect
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectExistingPipeline`}
              />
            </EuiFormRow>
          </EuiForm>
        </>
      ),
      id: ConfigurePipelineTabId.USE_EXISTING,
      name: USE_EXISTING_TAB_NAME,
    },
  ];

  return (
    <>
      <EuiTitle size="s">
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.title',
            { defaultMessage: 'Configure a pipeline' }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.description',
            {
              defaultMessage:
                'Build or reuse a child pipeline that will be used as a processor in your main pipeline.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTabbedContent
        tabs={tabs}
        autoFocus="selected"
        initialSelectedTab={tabs[existingPipeline ? 1 : 0]}
        onTabClick={(tab) => {
          const isExistingPipeline = tab.id === ConfigurePipelineTabId.USE_EXISTING;
          if (isExistingPipeline !== configuration.existingPipeline) {
            setInferencePipelineConfiguration({
              ...EMPTY_PIPELINE_CONFIGURATION,
              existingPipeline: isExistingPipeline,
            });
          }
        }}
      />
    </>
  );
};
