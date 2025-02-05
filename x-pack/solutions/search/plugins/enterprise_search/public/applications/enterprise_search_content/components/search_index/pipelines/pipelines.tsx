/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { CANCEL_BUTTON_LABEL } from '../../../../shared/constants';
import { DataPanel } from '../../../../shared/data_panel/data_panel';
import { docLinks } from '../../../../shared/doc_links';
import { RevertConnectorPipelineApilogic } from '../../../api/pipelines/revert_connector_pipeline_api_logic';
import { getContentExtractionDisabled, isApiIndex, isConnectorIndex } from '../../../utils/indices';

import { IndexNameLogic } from '../index_name_logic';

import { InferenceErrors } from './inference_errors';
import { InferenceHistory } from './inference_history';
import { CopyAndCustomizePipelinePanel } from './ingest_pipelines/customize_pipeline_item';
import { IngestPipelinesCard } from './ingest_pipelines/ingest_pipelines_card';
import { ManageCustomPipelineActions } from './ingest_pipelines/manage_custom_pipeline_actions';
import { AddInferencePipelineFlyout } from './ml_inference/add_inference_pipeline_flyout';
import { MlInferencePipelineProcessorsCard } from './ml_inference_pipeline_processors_card';
import { PipelinesJSONConfigurations } from './pipelines_json_configurations';
import { PipelinesLogic } from './pipelines_logic';

export const SearchIndexPipelines: React.FC = () => {
  const {
    showMissingPipelineCallout,
    showAddMlInferencePipelineModal,
    hasIndexIngestionPipeline,
    index,
    isDeleteModalOpen,
    pipelineName,
    defaultPipelineValues,
  } = useValues(PipelinesLogic);
  const {
    closeAddMlInferencePipelineModal,
    closeDeleteModal,
    fetchDefaultPipeline,
    setPipelineState,
  } = useActions(PipelinesLogic);
  const { indexName } = useValues(IndexNameLogic);
  const { status: revertStatus } = useValues(RevertConnectorPipelineApilogic);
  const { makeRequest: revertPipeline } = useActions(RevertConnectorPipelineApilogic);
  const apiIndex = isApiIndex(index);
  const extractionDisabled = getContentExtractionDisabled(index);

  useEffect(() => {
    if (index) {
      fetchDefaultPipeline(undefined);
      setPipelineState(
        isConnectorIndex(index)
          ? index.connector?.pipeline ?? defaultPipelineValues
          : defaultPipelineValues
      );
    }
  }, [index]);

  if (!index) {
    return <></>;
  }
  const pipelinesTabs: EuiTabbedContentTab[] = [
    {
      content: <InferenceHistory />,
      id: 'inference-history',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.inferenceHistory',
        {
          defaultMessage: 'Inference history',
        }
      ),
    },
    {
      content: <PipelinesJSONConfigurations />,
      id: 'json-configurations',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.indices.pipelines.tabs.jsonConfigurations',
        {
          defaultMessage: 'JSON configurations',
        }
      ),
    },
  ];

  return (
    <>
      {showMissingPipelineCallout && (
        <>
          <EuiCallOut
            color="danger"
            iconType="error"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.missingPipeline.title',
              {
                defaultMessage: 'Custom pipeline missing',
              }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.missingPipeline.description',
                {
                  defaultMessage:
                    'The custom pipeline for this index has been deleted. This may affect connector data ingestion. Its configuration will need to be reverted to the default pipeline settings.',
                }
              )}
            </p>
            <EuiButton color="danger" fill onClick={() => revertPipeline({ indexName })}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.missingPipeline.buttonLabel',
                {
                  defaultMessage: 'Revert pipeline to default',
                }
              )}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <CopyAndCustomizePipelinePanel />
      <EuiFlexGroup direction="row" wrap>
        <EuiFlexItem grow={5}>
          <DataPanel
            hasBorder
            footerDocLink={
              <EuiLink href={docLinks.ingestPipelines} target="_blank" color="subdued">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.docLink',
                  {
                    defaultMessage: 'Learn more about using pipelines in Search',
                  }
                )}
              </EuiLink>
            }
            title={
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.title',
                  {
                    defaultMessage: 'Ingest Pipelines',
                  }
                )}
              </h3>
            }
            subtitle={
              apiIndex
                ? i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.apiIndexSubtitle',
                    {
                      defaultMessage:
                        "Ingest pipelines optimize your index for search applications. If you'd like to use these pipelines in your API-based index, you'll need to reference them explicitly in your API requests.",
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.subtitle',
                    {
                      defaultMessage:
                        'Ingest pipelines optimize your index for search applications',
                    }
                  )
            }
            iconType="logstashInput"
            action={
              hasIndexIngestionPipeline ? (
                <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="accent">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.customBadge',
                        { defaultMessage: 'Custom' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ManageCustomPipelineActions />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EuiBadge>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.defaultBadge',
                    { defaultMessage: 'Default' }
                  )}
                </EuiBadge>
              )
            }
          >
            <IngestPipelinesCard extractionDisabled={extractionDisabled} />
          </DataPanel>
          <EuiSpacer />
          <DataPanel
            hasBorder
            footerDocLink={
              <EuiLink href={docLinks.deployTrainedModels} target="_blank" color="subdued">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.docLink',
                  {
                    defaultMessage: 'Learn more about deploying Machine Learning models in Elastic',
                  }
                )}
              </EuiLink>
            }
            title={
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.title',
                  {
                    defaultMessage: 'Machine Learning Inference Pipelines',
                  }
                )}
              </h3>
            }
            subtitle={
              apiIndex && hasIndexIngestionPipeline
                ? i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.subtitleAPIindex',
                    {
                      defaultMessage:
                        "Inference pipelines will be run as processors from the Search Ingest Pipeline. In order to use these pipelines on API-based indices you'll need to reference the {pipelineName} pipeline in your API requests.",
                      values: {
                        pipelineName,
                      },
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.mlInferencePipelines.subtitle',
                    {
                      defaultMessage:
                        'Inference pipelines will be run as processors from the Search Ingest Pipeline',
                    }
                  )
            }
            iconType="compute"
          >
            <MlInferencePipelineProcessorsCard />
          </DataPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <EuiPanel color="subdued">
            <EuiTabbedContent
              tabs={pipelinesTabs}
              initialSelectedTab={pipelinesTabs[0]}
              autoFocus="selected"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <InferenceErrors />
      {showAddMlInferencePipelineModal && (
        <AddInferencePipelineFlyout onClose={closeAddMlInferencePipelineModal} />
      )}
      {isDeleteModalOpen && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.deleteModal.title',
            {
              defaultMessage: 'Delete custom pipeline',
            }
          )}
          isLoading={revertStatus === Status.LOADING}
          onCancel={closeDeleteModal}
          onConfirm={() => revertPipeline({ indexName })}
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.deleteModal.confirmButton',
            {
              defaultMessage: 'Delete pipeline',
            }
          )}
          buttonColor="danger"
        >
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.deleteModal.description',
              {
                defaultMessage:
                  'This will delete any custom pipelines associated with this index, including machine learning inference pipelines. The index will revert to using the default ingest pipeline.',
              }
            )}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
