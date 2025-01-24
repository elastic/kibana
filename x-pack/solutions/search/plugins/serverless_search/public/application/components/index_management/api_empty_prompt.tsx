/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  CodeBox,
  getConsoleRequest,
  getLanguageDefinitionCodeSnippet,
  IngestPipelinePanel,
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';

import { DEFAULT_INGESTION_PIPELINE } from '../../../../common';
import { BACK_LABEL } from '../../../../common/i18n_string';

import { API_KEY_PLACEHOLDER, CLOUD_ID_PLACEHOLDER } from '../../constants';
import { useIngestPipelines } from '../../hooks/api/use_ingest_pipelines';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useElasticsearchUrl } from '../../hooks/use_elastisearch_url';
import { useKibanaServices } from '../../hooks/use_kibana';
import { ApiKeyPanel } from '../api_key/api_key';
import { javaDefinition } from '../languages/java';
import { LanguageGrid } from '../languages/language_grid';
import { languageDefinitions } from '../languages/languages';

export interface APIIndexEmptyPromptProps {
  indexName: string;
  onBackClick?: () => void;
}

export const APIIndexEmptyPrompt = ({ indexName, onBackClick }: APIIndexEmptyPromptProps) => {
  const { application, cloud, share } = useKibanaServices();
  const assetBasePath = useAssetBasePath();
  const [selectedLanguage, setSelectedLanguage] =
    React.useState<LanguageDefinition>(javaDefinition);

  const [selectedPipeline, setSelectedPipeline] = React.useState<string>('');
  const [clientApiKey, setClientApiKey] = useState<string>(API_KEY_PLACEHOLDER);
  const { elasticsearchUrl } = useElasticsearchUrl();
  const { cloudId } = useMemo(() => {
    return {
      cloudId: cloud?.cloudId ?? CLOUD_ID_PLACEHOLDER,
    };
  }, [cloud]);
  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchUrl,
    apiKey: clientApiKey,
    cloudId,
    indexName,
    ingestPipeline: selectedPipeline,
  };

  const { data: pipelineData } = useIngestPipelines();

  const apiIngestSteps: EuiContainedStepProps[] = [
    {
      title: i18n.translate(
        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.api.ingest.title',
        { defaultMessage: 'Ingest data via API using a programming language client' }
      ),
      children: (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <LanguageGrid
              assetBasePath={assetBasePath}
              setSelectedLanguage={setSelectedLanguage}
              languages={languageDefinitions}
              selectedLanguage={selectedLanguage.id}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <IngestPipelinePanel
              selectedPipeline={selectedPipeline}
              setSelectedPipeline={setSelectedPipeline}
              ingestPipelinesData={pipelineData?.pipelines}
              defaultIngestPipeline={DEFAULT_INGESTION_PIPELINE}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getLanguageDefinitionCodeSnippet(
                selectedLanguage,
                'ingestDataIndex',
                codeSnippetArguments
              )}
              consoleRequest={getConsoleRequest('ingestDataIndex')}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              assetBasePath={assetBasePath}
              application={application}
              sharePlugin={share}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      title: i18n.translate(
        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.api.apiKey.title',
        { defaultMessage: 'Prepare an API key' }
      ),
      children: <ApiKeyPanel setClientApiKey={setClientApiKey} />,
    },
  ];

  return (
    <EuiPanel>
      <EuiButtonEmpty
        data-test-subj="serverlessSearchAPIIndexEmptyPromptBackButton"
        onClick={onBackClick}
        iconSide="left"
        iconType="arrowLeft"
      >
        {BACK_LABEL}
      </EuiButtonEmpty>
      <EuiEmptyPrompt
        icon={<EuiIcon type="addDataApp" size="xl" />}
        title={
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.api.title"
                defaultMessage="Ingest content"
              />
            </h5>
          </EuiTitle>
        }
        body={
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.api.body"
                defaultMessage="Customize these variables to match your content. For a full setup guide, visit our {getStartedLink} guide."
                values={{
                  getStartedLink: (
                    <EuiLink
                      data-test-subj="serverlessSearchAPIIndexEmptyPromptGetStartedLink"
                      onClick={() => application.navigateToApp('elasticsearch')}
                    >
                      {i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.api.body.getStartedLink',
                        { defaultMessage: 'Get started' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        }
      />
      <EuiSpacer />
      <EuiSteps steps={apiIngestSteps} titleSize="xs" />
    </EuiPanel>
  );
};
