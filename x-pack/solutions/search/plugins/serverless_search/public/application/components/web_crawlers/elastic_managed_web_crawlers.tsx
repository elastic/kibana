/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TECH_PREVIEW_LABEL } from '../../../../common/i18n_string';
import { useWebCrawlers } from '../../hooks/api/use_web_crawlers';
import { CreateWebCrawlerFlyout } from './create_web_crawler_flyout';
import { ElasticManagedWebCrawlersEmptyPrompt } from './elastic_managed_web_crawlers_empty_prompt';
import { WebCrawlersTable } from './web_crawlers_table';

const CREATE_LABEL = i18n.translate('xpack.serverlessSearch.webCrawlers.createButton', {
  defaultMessage: 'Create web crawler',
});

export const ElasticManagedWebCrawlers: React.FC = () => {
  const { data, isLoading, isError } = useWebCrawlers();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isError || !data?.agentlessEnabled) {
    return <ElasticManagedWebCrawlersEmptyPrompt />;
  }

  const flyout = isFlyoutOpen ? (
    <CreateWebCrawlerFlyout onClose={() => setIsFlyoutOpen(false)} />
  ) : null;

  if (data.crawlers.length === 0) {
    return (
      <>
        <EuiEmptyPrompt
          data-test-subj="serverlessSearchWebCrawlersEmptyPrompt"
          iconType="web"
          title={
            <h2>
              {i18n.translate('xpack.serverlessSearch.webCrawlers.empty.title', {
                defaultMessage: 'Create your first Elastic managed web crawler',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.serverlessSearch.webCrawlers.empty.description', {
                defaultMessage:
                  'Elastic runs the crawler for you, no infrastructure needed. Provide the websites to crawl and the index to fill; crawls run on a schedule or on demand. {techPreview}',
                values: { techPreview: TECH_PREVIEW_LABEL },
              })}
            </p>
          }
          actions={
            <EuiButton
              data-test-subj="serverlessSearchCreateWebCrawlerButton"
              fill
              iconType="plusCircle"
              onClick={() => setIsFlyoutOpen(true)}
            >
              {CREATE_LABEL}
            </EuiButton>
          }
        />
        {flyout}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="serverlessSearchCreateWebCrawlerButton"
            fill
            iconType="plusCircle"
            onClick={() => setIsFlyoutOpen(true)}
          >
            {CREATE_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <WebCrawlersTable crawlers={data.crawlers} />
      {flyout}
    </>
  );
};
