/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiSpacer, EuiTitle } from '@elastic/eui';

import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { KibanaLogic } from '../../../shared/kibana';
import { handlePageChange } from '../../../shared/table_pagination';
import { NEW_INDEX_SELECT_CONNECTOR_PATH } from '../../routes';
import { getEnterpriseSearchContentUrl } from '../../utils/get_enterprise_search_content_url';
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

  const listingMenu = useMemo<AppHeaderMenu | undefined>(() => {
    if (isLoading || isCrawler) {
      return undefined;
    }

    return {
      ...(productFeatures.hasDefaultIngestPipeline
        ? {
            items: [
              {
                id: 'defaultSettings',
                label: i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndices.defaultSettings',
                  {
                    defaultMessage: 'Default settings',
                  }
                ),
                iconType: 'gear',
                testId: 'entSearchContent-searchIndices-defaultSettings',
                run: () => setShowDefaultSettingsFlyout(true),
              },
            ],
          }
        : {}),
      primaryActionItem: {
        id: 'newConnector',
        label: i18n.translate('xpack.enterpriseSearch.connectors.newConnectorButtonLabel', {
          defaultMessage: 'New Connector',
        }),
        iconType: 'plusCircle',
        testId: 'entSearchContent-connectors-newConnectorButton',
        href: getEnterpriseSearchContentUrl(NEW_INDEX_SELECT_CONNECTOR_PATH),
      },
    };
  }, [isCrawler, isLoading, productFeatures.hasDefaultIngestPipeline]);

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
        appHeader={
          <AppHeader
            title={
              !isCrawler
                ? i18n.translate('xpack.enterpriseSearch.connectors.title', {
                    defaultMessage: 'Elasticsearch connectors',
                  })
                : i18n.translate('xpack.enterpriseSearch.crawlers.title', {
                    defaultMessage: 'Elastic Web Crawler',
                  })
            }
            description={{
              text: i18n.translate('xpack.enterpriseSearch.webcrawlers.headerContentPlain', {
                defaultMessage:
                  'Discover, extract and index searchable content from websites and knowledge bases',
              }),
              learnMoreUrl: 'https://github.com/elastic/crawler',
            }}
            menu={listingMenu}
          />
        }
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
              <EuiFlexItem grow={false}>
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
              <EuiFlexItem grow={false}>
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
