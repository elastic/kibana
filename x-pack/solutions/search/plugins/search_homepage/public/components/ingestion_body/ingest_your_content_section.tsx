/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCard,
  EuiPanel,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiButton,
  IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ENTERPRISE_SEARCH_CONNECTORS_ID,
  ENTERPRISE_SEARCH_WEB_CRAWLERS_ID,
  SERVERLESS_ES_CONNECTORS_ID,
  SERVERLESS_ES_WEB_CRAWLERS_ID,
} from '@kbn/deeplinks-search';

import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';
import { SampleDataActionButton } from '../sample_data_action_button';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

export const IngestYourContentSection = () => {
  const { application, chrome, cloud } = useKibana().services;
  const usageTracker = useUsageTracker();
  const assetBasePath = useAssetBasePath();
  const onFileUpload = useCallback(() => {
    usageTracker.click(AnalyticsEvents.ingestVariantUploadFileClick);
    application.navigateToApp('ml', { path: 'filedatavisualizer' });
  }, [application, usageTracker]);
  const connectorsLink = chrome.navLinks.get(
    cloud?.isServerlessEnabled ? SERVERLESS_ES_CONNECTORS_ID : ENTERPRISE_SEARCH_CONNECTORS_ID
  );
  const webCrawlersLink = chrome.navLinks.get(
    cloud?.isServerlessEnabled ? SERVERLESS_ES_WEB_CRAWLERS_ID : ENTERPRISE_SEARCH_WEB_CRAWLERS_ID
  );
  const onWebCrawlersClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      usageTracker.click(AnalyticsEvents.ingestVariantWebCrawlerClick);
      if (webCrawlersLink) {
        e.preventDefault();
        application.navigateToUrl(webCrawlersLink.href);
      }
    },
    [webCrawlersLink, application, usageTracker]
  );
  const onConnectorsClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      usageTracker.click(AnalyticsEvents.ingestVariantConnectorsClick);
      if (connectorsLink) {
        e.preventDefault();
        application.navigateToUrl(connectorsLink.href);
      }
    },
    [connectorsLink, application, usageTracker]
  );

  return (
    <EuiPanel hasShadow={false}>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiImage size="s" alt="" src={`${assetBasePath}/arrow_deploy.svg`} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.searchHomepage.ingestContentSection.title"
                  defaultMessage="Ingest your content"
                />
              </h3>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.searchHomepage.ingestContentSection.description"
                  defaultMessage="Choose from various methods and source to import your data, ensuring a perfect fit for your technical skills and data sources."
                />
              </p>
            </EuiText>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
                <EuiText size="s">
                  <p>
                    <strong>
                      <FormattedMessage
                        id="xpack.searchHomepage.ingestContentSection.sampleData.label"
                        defaultMessage="Want to try sample data?"
                      />
                    </strong>
                  </p>
                </EuiText>
                <SampleDataActionButton
                  clickEvent={AnalyticsEvents.ingestVariantInstallSampleDataClick}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGrid columns={3}>
        <IngestionSourceCard
          icon="document"
          title={i18n.translate('xpack.searchHomepage.ingestContentSection.fileUpload.title', {
            defaultMessage: 'Upload a file',
          })}
          description={i18n.translate(
            'xpack.searchHomepage.ingestContentSection.fileUpload.description',
            { defaultMessage: 'Quickly analyze and import data into an Elasticsearch' }
          )}
          action={
            <EuiButton data-test-subj="uploadFileButton" onClick={onFileUpload}>
              {i18n.translate('xpack.searchHomepage.ingestContentSection.fileUpload.cta', {
                defaultMessage: 'Upload a file',
              })}
            </EuiButton>
          }
        />

        {webCrawlersLink !== undefined && (
          <IngestionSourceCard
            icon="web"
            title={i18n.translate('xpack.searchHomepage.ingestContentSection.webCrawler.title', {
              defaultMessage: 'Crawl a website',
            })}
            description={i18n.translate(
              'xpack.searchHomepage.ingestContentSection.webCrawler.description',
              { defaultMessage: 'Extract searchable content from websites and knowledge bases.' }
            )}
            action={
              <EuiButton
                data-test-subj="viewElasticWebCrawler"
                href={webCrawlersLink.href}
                onClick={onWebCrawlersClick}
              >
                {i18n.translate('xpack.searchHomepage.ingestContentSection.webCrawler.cta', {
                  defaultMessage: 'View Elastic Open Web Crawler',
                })}
              </EuiButton>
            }
          />
        )}
        {connectorsLink !== undefined && (
          <IngestionSourceCard
            icon="plugs"
            title={i18n.translate('xpack.searchHomepage.ingestContentSection.connectors.title', {
              defaultMessage: 'Connect to a third-party data source',
            })}
            description={i18n.translate(
              'xpack.searchHomepage.ingestContentSection.connectors.description',
              {
                defaultMessage:
                  'Sync third-party data sources to Elasticsearch, by deploying Elastic connectors on your own infrastructure.',
              }
            )}
            action={
              <EuiButton
                data-test-subj="addConnectorButton"
                href={connectorsLink.href}
                onClick={onConnectorsClick}
              >
                {i18n.translate('xpack.searchHomepage.ingestContentSection.connectors.cta', {
                  defaultMessage: 'Add a connector',
                })}
              </EuiButton>
            }
          />
        )}
      </EuiFlexGrid>
    </EuiPanel>
  );
};

interface IngestionSourceCardProps {
  icon: IconType;
  title: NonNullable<React.ReactNode>;
  description: NonNullable<React.ReactNode>;
  action: NonNullable<React.ReactNode>;
}
const IngestionSourceCard = ({ icon, title, description, action }: IngestionSourceCardProps) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiCard
        icon={<EuiIcon type={icon} />}
        textAlign="left"
        title={title}
        titleSize="xs"
        description={description}
        footer={action}
      />
    </EuiFlexItem>
  );
};
