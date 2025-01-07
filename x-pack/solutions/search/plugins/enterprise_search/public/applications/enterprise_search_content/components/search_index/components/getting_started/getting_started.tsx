/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { LanguageDefinitionSnippetArguments } from '@kbn/search-api-panels';

import { useCloudDetails } from '../../../../../shared/cloud_details/cloud_details';

import { GettingStarted } from '../../../../../shared/getting_started/getting_started';
import { IndexViewLogic } from '../../index_view_logic';
import { OverviewLogic } from '../../overview.logic';
import { GenerateApiKeyModal } from '../generate_api_key_modal/modal';

const DEFAULT_URL = 'https://localhost:9200';

export const APIGettingStarted = () => {
  const { apiKey, isGenerateModalOpen, indexPipelineParameters } = useValues(OverviewLogic);
  const { fetchIndexPipelineParameters, openGenerateModal, closeGenerateModal } =
    useActions(OverviewLogic);
  const { indexName } = useValues(IndexViewLogic);

  const cloudContext = useCloudDetails();

  useEffect(() => {
    fetchIndexPipelineParameters({ indexName });
  }, [indexName]);

  const codeArgs: LanguageDefinitionSnippetArguments = {
    apiKey,
    cloudId: cloudContext.cloudId,
    extraIngestDocumentValues: {
      _extract_binary_content: indexPipelineParameters.extract_binary_content,
      _reduce_whitespace: indexPipelineParameters.reduce_whitespace,
      _run_ml_inference: indexPipelineParameters.run_ml_inference,
    },
    indexName,
    ingestPipeline: indexPipelineParameters.name,
    url: cloudContext.elasticsearchUrl || DEFAULT_URL,
  };

  return (
    <>
      {isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexName} onClose={closeGenerateModal} />
      )}
      <EuiTitle size="l">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.gettingStarted.pageTitle', {
            defaultMessage: 'Getting started with Elastic API',
          })}
        </h2>
      </EuiTitle>
      <GettingStarted openApiKeyModal={openGenerateModal} codeArgs={codeArgs} />
    </>
  );
};
