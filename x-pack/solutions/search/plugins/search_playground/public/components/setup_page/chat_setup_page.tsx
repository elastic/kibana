/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQueryIndices } from '../../hooks/use_query_indices';
import { docLinks } from '../../../common/doc_links';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';
import { AddDataSources } from './add_data_sources';
import { ConnectLLMButton } from './connect_llm_button';
import { CreateIndexButton } from './create_index_button';
import { UploadFileButton } from '../upload_file_button';

export const ChatSetupPage: React.FC = () => {
  const usageTracker = useUsageTracker();
  const { indices, isLoading: isIndicesLoading } = useQueryIndices();

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.setupChatPageLoaded);
  }, [usageTracker]);

  return (
    <EuiEmptyPrompt
      iconType="discuss"
      data-test-subj="setupPage"
      title={
        <h2>
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.title"
            defaultMessage="Set up a chat experience"
          />
        </h2>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.setupPage.description"
              defaultMessage="Experiment with combining your Elasticsearch data with powerful large language models (LLMs) using Playground for retrieval augmented generation (RAG)."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.setupPage.descriptionLLM"
              defaultMessage="Connect to your LLM provider and select your data sources to get started."
            />
          </p>
        </>
      }
      actions={
        <EuiFlexGroup justifyContent="center">
          {isIndicesLoading ? (
            <EuiLoadingSpinner />
          ) : (
            <>
              <EuiFlexItem grow={false}>
                <ConnectLLMButton />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {indices.length ? <AddDataSources /> : <CreateIndexButton />}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <UploadFileButton isSetup={true} />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              <FormattedMessage
                id="xpack.searchPlayground.setupPage.learnMore"
                defaultMessage="Want to learn more?"
              />
            </span>
          </EuiTitle>{' '}
          <EuiLink
            data-test-subj="searchPlaygroundChatSetupPageReadDocumentationLink"
            href={docLinks.chatPlayground}
            target="_blank"
            external
          >
            <FormattedMessage
              id="xpack.searchPlayground.setupPage.documentationLink"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </>
      }
    />
  );
};
