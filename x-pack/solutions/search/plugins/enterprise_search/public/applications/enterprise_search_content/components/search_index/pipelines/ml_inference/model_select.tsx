/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiScreenReaderLive,
  EuiSelectable,
  EuiSelectableOption,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';

import { LicenseBadge } from './license_badge';
import { ModelSelectLogic } from './model_select_logic';
import { ModelSelectOption } from './model_select_option';
import { normalizeModelName } from './utils';

type EuiSelectableOptionWithMlModelData = EuiSelectableOption & {
  data: MlModel;
};

export const DeployModelButton: React.FC<{
  onClick: () => void;
  modelId: string;
  disabled: boolean;
}> = ({ onClick, modelId, disabled }) => {
  return (
    <EuiButton
      onClick={onClick}
      disabled={disabled}
      color="primary"
      iconType="download"
      size="s"
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.deployButton.ariaLabel',
        {
          defaultMessage: 'Deploy {modelId} model',
          values: {
            modelId,
          },
        }
      )}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.deployButton.label',
        {
          defaultMessage: 'Deploy',
        }
      )}
    </EuiButton>
  );
};

export const ModelDeployingButton: React.FC = () => {
  return (
    <EuiButton disabled color="primary" size="s">
      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.deployingButton.label',
            {
              defaultMessage: 'Deploying',
            }
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButton>
  );
};

export const StartModelButton: React.FC<{
  onClick: () => void;
  modelId: string;
  disabled: boolean;
}> = ({ onClick, modelId, disabled }) => {
  return (
    <EuiButton
      onClick={onClick}
      disabled={disabled}
      color="success"
      iconType="play"
      size="s"
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.startButton.ariaLabel',
        {
          defaultMessage: 'Start {modelId} model',
          values: {
            modelId,
          },
        }
      )}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.startButton.label',
        {
          defaultMessage: 'Start',
        }
      )}
    </EuiButton>
  );
};

export const ModelStartingButton: React.FC = () => {
  return (
    <EuiButton disabled color="success" size="s">
      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.startingButton.label',
            {
              defaultMessage: 'Starting',
            }
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButton>
  );
};

export const NoModelSelected: React.FC = () => (
  <EuiPanel
    color="subdued"
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <EuiText textAlign="center" color="subdued" size="s">
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.noModelSelectedPanel.text',
        { defaultMessage: 'Select an available model to add to your inference pipeline' }
      )}
    </EuiText>
  </EuiPanel>
);

export const SelectedModel: React.FC<MlModel> = (model) => {
  const { createModel, startModel } = useActions(ModelSelectLogic);
  const { areActionButtonsDisabled } = useValues(ModelSelectLogic);

  const getSelectedModelAnnouncement = (selectedModel: MlModel) =>
    selectedModel.isPlaceholder
      ? i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.selectedModelNotDeployedAnnouncement',
          {
            defaultMessage: '{modelId} model selected but not deployed',
            values: {
              modelId: selectedModel.modelId,
            },
          }
        )
      : selectedModel.deploymentState === MlModelDeploymentState.NotDeployed
      ? i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.selectedModelNotStartedAnnouncement',
          {
            defaultMessage: '{modelId} model selected but not started',
            values: {
              modelId: selectedModel.modelId,
            },
          }
        )
      : i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.selectedModelAnnouncement',
          {
            defaultMessage: '{modelId} model selected',
            values: {
              modelId: selectedModel.modelId,
            },
          }
        );

  return (
    <EuiPanel color="subdued" title="Selected model">
      <EuiScreenReaderLive>{getSelectedModelAnnouncement(model)}</EuiScreenReaderLive>
      <EuiPanel>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{model.title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">{model.modelId}</EuiTextColor>
          </EuiFlexItem>
          {model.description && (
            <EuiFlexItem>
              <EuiText size="xs">{model.description}</EuiText>
            </EuiFlexItem>
          )}
          {model.licenseType && (
            <EuiFlexItem grow={false}>
              {/* Wrap in a span to prevent the badge from growing to a whole row on mobile */}
              <span>
                <LicenseBadge
                  licenseType={model.licenseType}
                  modelDetailsPageUrl={model.modelDetailsPageUrl}
                />
              </span>
            </EuiFlexItem>
          )}
          {(model.isPlaceholder ||
            [
              MlModelDeploymentState.Downloading,
              MlModelDeploymentState.NotDeployed,
              MlModelDeploymentState.Starting,
            ].includes(model.deploymentState)) && (
            <>
              <EuiHorizontalRule margin="xs" />
              <EuiFlexItem grow={false} aria-live="polite" aria-atomic="false">
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  {model.isPlaceholder ? (
                    <>
                      <EuiFlexItem grow={false}>
                        <DeployModelButton
                          onClick={() => createModel(model.modelId)}
                          modelId={model.modelId}
                          disabled={areActionButtonsDisabled}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <p>
                            <EuiTextColor color="danger">
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.indices.pipelines.modelSelect.modelNotDeployedError',
                                { defaultMessage: 'Model must be deployed before use.' }
                              )}
                            </EuiTextColor>
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                    </>
                  ) : model.deploymentState === MlModelDeploymentState.Downloading ? (
                    <EuiFlexItem grow={false}>
                      <ModelDeployingButton />
                    </EuiFlexItem>
                  ) : model.deploymentState === MlModelDeploymentState.NotDeployed ? (
                    <EuiFlexItem grow={false}>
                      <StartModelButton
                        onClick={() => startModel(model.modelId)}
                        modelId={model.modelId}
                        disabled={areActionButtonsDisabled}
                      />
                    </EuiFlexItem>
                  ) : model.deploymentState === MlModelDeploymentState.Starting ? (
                    <EuiFlexItem grow={false}>
                      <ModelStartingButton />
                    </EuiFlexItem>
                  ) : (
                    <></>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};

export const ModelSelect: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration, indexName },
    ingestionMethod,
    isLoading,
    selectableModels,
    selectedModel,
  } = useValues(ModelSelectLogic);
  const { setInferencePipelineConfiguration } = useActions(ModelSelectLogic);
  const { euiTheme } = useEuiTheme();

  const { modelID, pipelineName, isPipelineNameUserSupplied } = configuration;
  const rowHeight = useIsWithinMaxBreakpoint('s') ? euiTheme.base * 8 : euiTheme.base * 6;
  const maxVisibleOptions = 4.5;
  const [listHeight, setListHeight] = useState(maxVisibleOptions * rowHeight);

  const getModelSelectOptionProps = (models: MlModel[]): EuiSelectableOptionWithMlModelData[] =>
    (models ?? []).map((model) => ({
      label: model.modelId,
      checked: model.modelId === modelID ? 'on' : undefined,
      data: { ...model },
    }));

  const onChange = (options: EuiSelectableOptionWithMlModelData[]) => {
    const selectedModelOption = options.find((option) => option.checked === 'on');

    setInferencePipelineConfiguration({
      ...configuration,
      inferenceConfig: undefined,
      modelID: selectedModelOption?.data.modelId ?? '',
      isModelPlaceholderSelected: selectedModelOption?.data.isPlaceholder ?? false,
      fieldMappings: undefined,
      pipelineName: isPipelineNameUserSupplied
        ? pipelineName
        : indexName + '-' + normalizeModelName(selectedModelOption?.data.modelId ?? ''),
    });
  };

  const onSearchChange = (_: string, matchingOptions: EuiSelectableOptionWithMlModelData[]) => {
    setListHeight(Math.min(maxVisibleOptions, matchingOptions.length) * rowHeight);
  };

  const renderOption = (option: EuiSelectableOptionWithMlModelData) => {
    const { data, ...optionExclData } = option;
    const flattenedOption = { ...optionExclData, ...data };
    return <ModelSelectOption {...flattenedOption} />;
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSelectable
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-configureInferencePipeline-selectTrainedModel`}
          options={getModelSelectOptionProps(selectableModels)}
          singleSelection="always"
          listProps={{
            bordered: true,
            rowHeight,
            onFocusBadge: false,
          }}
          height={listHeight}
          onChange={onChange}
          renderOption={renderOption}
          isLoading={isLoading}
          searchable
          searchProps={{
            onChange: onSearchChange,
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFlexItem>
      <EuiFlexItem>
        {selectedModel ? <SelectedModel {...selectedModel} /> : <NoModelSelected />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
