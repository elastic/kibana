/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { LEARN_MORE_LINK } from '../../../shared/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { handlePageChange } from '../../../shared/table_pagination';
import { NEW_INDEX_SELECT_CONNECTOR_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout';

import { DefaultSettingsFlyout } from '../settings/default_settings_flyout';

import { ConnectorStats } from './connector_stats';
import { ConnectorsLogic } from './connectors_logic';
import { ConnectorsTable } from './connectors_table';
import { CreateConnector } from './create_connector';
import { DeleteConnectorModal } from './delete_connector_modal';
import { ElasticManagedWebCrawlerEmptyPrompt } from './elastic_managed_web_crawler_empty_prompt';
import { SelfManagedWebCrawlerEmptyPrompt } from './self_managed_web_crawler_empty_prompt';

export const connectorsBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.connectors.breadcrumb', {
    defaultMessage: 'Connectors',
  }),
];

export const crawlersBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.crawlers.breadcrumb', {
    defaultMessage: 'Web Crawlers',
  }),
];

export interface ConnectorsProps {
  isCrawler: boolean;
  isCrawlerSelfManaged?: boolean;
}
export const Connectors: React.FC<ConnectorsProps> = ({ isCrawler, isCrawlerSelfManaged }) => {
  const { fetchConnectors, onPaginate, setIsFirstRequest, openDeleteModal } =
    useActions(ConnectorsLogic);
  const { data, isLoading, searchParams, isEmpty, connectors } = useValues(ConnectorsLogic);
  const [searchQuery, setSearchValue] = useState('');
  const [showDefaultSettingsFlyout, setShowDefaultSettingsFlyout] = useState<boolean>(false);
  const { productFeatures } = useValues(KibanaLogic);

  useEffect(() => {
    setIsFirstRequest();
  }, [isCrawler]);

  useEffect(() => {
    fetchConnectors({ ...searchParams, fetchCrawlersOnly: isCrawler, searchQuery });
  }, [searchParams.from, searchParams.size, searchQuery, isCrawler]);

  return !isLoading && isEmpty && !isCrawler ? (
    <CreateConnector />
  ) : (
    <>
      <DeleteConnectorModal isCrawler={isCrawler} />
      <EnterpriseSearchContentPageTemplate
        data-test-subj="searchConnectorsPage"
        pageChrome={!isCrawler ? connectorsBreadcrumbs : crawlersBreadcrumbs}
        pageViewTelemetry={!isCrawler ? 'Connectors' : 'Web Crawlers'}
        isLoading={isLoading}
        pageHeader={{
          pageTitle: !isCrawler
            ? i18n.translate('xpack.enterpriseSearch.connectors.title', {
                defaultMessage: 'Elasticsearch connectors',
              })
            : i18n.translate('xpack.enterpriseSearch.crawlers.title', {
                defaultMessage: 'Elastic Web Crawler',
              }),
          description: [
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.webcrawlers.headerContent"
                  defaultMessage="Discover extract and index searchable content from websites and knowledge bases {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        data-test-subj="entSearchContentConnectorsLearnMoreLink"
                        external
                        target="_blank"
                        href={'https://github.com/elastic/crawler'}
                      >
                        {LEARN_MORE_LINK}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>,
          ],

          rightSideGroupProps: {
            gutterSize: 's',
            responsive: false,
          },
          rightSideItems: isLoading
            ? []
            : !isCrawler
            ? [
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="entSearchContent-connectors-newConnectorButton"
                      data-telemetry-id="entSearchContent-connectors-newConnectorButton"
                      key="newConnector"
                      color="primary"
                      iconType="plusInCircle"
                      fill
                      onClick={() => {
                        KibanaLogic.values.navigateToUrl(NEW_INDEX_SELECT_CONNECTOR_PATH);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.enterpriseSearch.connectors.newConnectorButtonLabel"
                        defaultMessage="New Connector"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>,
                ...(productFeatures.hasDefaultIngestPipeline
                  ? [
                      <EuiButton
                        color="primary"
                        data-test-subj="entSearchContent-searchIndices-defaultSettings"
                        onClick={() => setShowDefaultSettingsFlyout(true)}
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.searchIndices.defaultSettings',
                          {
                            defaultMessage: 'Default settings',
                          }
                        )}
                      </EuiButton>,
                    ]
                  : []),
              ]
            : undefined,
        }}
      >
        {productFeatures.hasDefaultIngestPipeline && showDefaultSettingsFlyout && (
          <DefaultSettingsFlyout closeFlyout={() => setShowDefaultSettingsFlyout(false)} />
        )}
        {!isCrawler && (
          <>
            <ConnectorStats isCrawler={isCrawler} />
            <EuiSpacer />
          </>
        )}

        <EuiFlexGroup direction="column">
          {isEmpty && isCrawler ? (
            isCrawlerSelfManaged ? (
              <SelfManagedWebCrawlerEmptyPrompt />
            ) : (
              <ElasticManagedWebCrawlerEmptyPrompt />
            )
          ) : (
            <>
              <EuiFlexItem>
                <EuiTitle>
                  <h2>
                    {!isCrawler ? (
                      <FormattedMessage
                        id="xpack.enterpriseSearch.connectorsTable.h2.availableConnectorsLabel"
                        defaultMessage="Available connectors"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.enterpriseSearch.connectorsTable.h2.availableCrawlersLabel"
                        defaultMessage="Available web crawlers"
                      />
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSearchBar
                  query={searchQuery}
                  box={{
                    incremental: true,
                    placeholder: !isCrawler
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsPlaceholder',
                          { defaultMessage: 'Filter connectors' }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterCrawlersPlaceholder',
                          { defaultMessage: 'Filter web crawlers' }
                        ),
                  }}
                  aria-label={
                    !isCrawler
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsLabel',
                          { defaultMessage: 'Filter connectors' }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterCrawlersLabel',
                          { defaultMessage: 'Filter web crawlers' }
                        )
                  }
                  onChange={(event) => setSearchValue(event.queryText)}
                />
              </EuiFlexItem>
              <ConnectorsTable
                isCrawler={isCrawler}
                items={connectors || []}
                meta={data?.meta}
                onChange={handlePageChange(onPaginate)}
                onDelete={openDeleteModal}
              />
            </>
          )}
        </EuiFlexGroup>
      </EnterpriseSearchContentPageTemplate>
    </>
  );
};
