/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { AppHeader, type AppHeaderTab, type AppHeaderTitle } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { flashSuccessToast } from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';
import { putConnectorNameAndDescription } from '../../api/connector/update_connector_name_and_description_api_logic';
import { CONNECTOR_DETAIL_TAB_PATH, CONNECTORS_PATH } from '../../routes';
import { getEnterpriseSearchContentUrl } from '../../utils/get_enterprise_search_content_url';
import { connectorsBreadcrumbs } from '../connectors/connectors';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { ConnectorScheduling } from '../search_index/connector/connector_scheduling';
import { ConnectorSyncRules } from '../search_index/connector/sync_rules/connector_rules';
import { SearchIndexDocuments } from '../search_index/documents';
import { SearchIndexIndexMappings } from '../search_index/index_mappings';
import { SearchIndexPipelines } from '../search_index/pipelines/pipelines';
import { useSyncsAppHeaderMenu } from '../shared/header_actions/use_syncs_app_header_menu';

import { ConnectorConfiguration } from './connector_configuration';
import { ConnectorViewLogic } from './connector_view_logic';
import { ConnectorDetailOverview } from './overview';

export enum ConnectorDetailTabId {
  // all indices
  OVERVIEW = 'overview',
  DOCUMENTS = 'documents',
  INDEX_MAPPINGS = 'index_mappings',
  PIPELINES = 'pipelines',
  // connector indices
  CONFIGURATION = 'configuration',
  SYNC_RULES = 'sync_rules',
  SCHEDULING = 'scheduling',
}

export const ConnectorDetail: React.FC = () => {
  const connectorId = decodeURIComponent(useParams<{ connectorId: string }>().connectorId);
  const { hasFilteringFeature, isLoading, index, connector } = useValues(ConnectorViewLogic);
  const { fetchConnectorApiReset, startConnectorPoll, stopConnectorPoll, updateConnectorData } =
    useActions(ConnectorViewLogic);
  useEffect(() => {
    stopConnectorPoll();
    fetchConnectorApiReset();
    startConnectorPoll(connectorId);
  }, [connectorId]);

  const { tabId = ConnectorDetailTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const {
    productFeatures: { hasDefaultIngestPipeline },
  } = useValues(KibanaLogic);

  const syncsMenu = useSyncsAppHeaderMenu();

  const tabs = useMemo(() => {
    const getTabHref = (nextTabId: ConnectorDetailTabId) =>
      getEnterpriseSearchContentUrl(
        generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
          connectorId,
          tabId: nextTabId,
        })
      );

    return [
      {
        content: <ConnectorDetailOverview />,
        disabled: false,
        href: getTabHref(ConnectorDetailTabId.OVERVIEW),
        id: ConnectorDetailTabId.OVERVIEW,
        isSelected: tabId === ConnectorDetailTabId.OVERVIEW,
        label: i18n.translate(
          'xpack.enterpriseSearch.content.connectors.connectorDetail.overviewTabLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
      },
      {
        content: <SearchIndexDocuments />,
        disabled: !index || Boolean(connector?.is_native),
        href: getTabHref(ConnectorDetailTabId.DOCUMENTS),
        id: ConnectorDetailTabId.DOCUMENTS,
        isSelected: tabId === ConnectorDetailTabId.DOCUMENTS,
        label: i18n.translate(
          'xpack.enterpriseSearch.content.connectors.connectorDetail.documentsTabLabel',
          {
            defaultMessage: 'Documents',
          }
        ),
      },
      {
        content: <SearchIndexIndexMappings />,
        disabled: !index || Boolean(connector?.is_native),
        href: getTabHref(ConnectorDetailTabId.INDEX_MAPPINGS),
        id: ConnectorDetailTabId.INDEX_MAPPINGS,
        isSelected: tabId === ConnectorDetailTabId.INDEX_MAPPINGS,
        label: i18n.translate(
          'xpack.enterpriseSearch.content.connectors.connectorDetail.indexMappingsTabLabel',
          {
            defaultMessage: 'Mappings',
          }
        ),
      },
      ...(hasFilteringFeature
        ? [
            {
              content: <ConnectorSyncRules />,
              disabled: !index || Boolean(connector?.is_native),
              href: getTabHref(ConnectorDetailTabId.SYNC_RULES),
              id: ConnectorDetailTabId.SYNC_RULES,
              isSelected: tabId === ConnectorDetailTabId.SYNC_RULES,
              label: i18n.translate(
                'xpack.enterpriseSearch.content.connectors.connectorDetail.syncRulesTabLabel',
                {
                  defaultMessage: 'Sync rules',
                }
              ),
            },
          ]
        : []),
      {
        content: <ConnectorScheduling />,
        disabled: !connector?.index_name || Boolean(connector?.is_native),
        href: getTabHref(ConnectorDetailTabId.SCHEDULING),
        id: ConnectorDetailTabId.SCHEDULING,
        isSelected: tabId === ConnectorDetailTabId.SCHEDULING,
        label: i18n.translate(
          'xpack.enterpriseSearch.content.connectors.connectorDetail.schedulingTabLabel',
          {
            defaultMessage: 'Scheduling',
          }
        ),
      },
      ...(hasDefaultIngestPipeline
        ? [
            {
              content: <SearchIndexPipelines />,
              disabled: !index || Boolean(connector?.is_native),
              href: getTabHref(ConnectorDetailTabId.PIPELINES),
              id: ConnectorDetailTabId.PIPELINES,
              isSelected: tabId === ConnectorDetailTabId.PIPELINES,
              label: i18n.translate(
                'xpack.enterpriseSearch.content.connectors.connectorDetail.pipelinesTabLabel',
                {
                  defaultMessage: 'Pipelines',
                }
              ),
            },
          ]
        : []),
      {
        content: <ConnectorConfiguration />,
        disabled: Boolean(connector?.is_native),
        href: getTabHref(ConnectorDetailTabId.CONFIGURATION),
        id: ConnectorDetailTabId.CONFIGURATION,
        isSelected: tabId === ConnectorDetailTabId.CONFIGURATION,
        label: i18n.translate(
          'xpack.enterpriseSearch.content.connectors.connectorDetail.configurationTabLabel',
          {
            defaultMessage: 'Configuration',
          }
        ),
      },
    ];
  }, [
    connector?.index_name,
    connector?.is_native,
    connectorId,
    hasDefaultIngestPipeline,
    hasFilteringFeature,
    index,
    tabId,
  ]);

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabId, tabs]);

  const onSaveTitle = useCallback(
    async (nextTitle: string) => {
      if (!connector) {
        return;
      }

      const name = nextTitle.trim();
      if (!name) {
        return i18n.translate(
          'xpack.enterpriseSearch.content.nameAndDescription.name.error.empty',
          {
            defaultMessage: 'Connector name cannot be empty',
          }
        );
      }

      try {
        await putConnectorNameAndDescription({
          connectorId: connector.id,
          description: connector.description,
          name,
        });
        updateConnectorData({ name });
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescription.successToast.title',
            { defaultMessage: 'Connector name and description updated' }
          )
        );
      } catch {
        return i18n.translate(
          'xpack.enterpriseSearch.connectors.nameAndDescription.name.error.saveFailed',
          { defaultMessage: 'Unable to update connector name' }
        );
      }
    },
    [connector, updateConnectorData]
  );

  const headerTitle = useMemo<AppHeaderTitle>(
    () =>
      connector
        ? {
            ariaLabel: i18n.translate(
              'xpack.enterpriseSearch.content.connectors.nameAndDescription.name.ariaLabel',
              {
                defaultMessage: 'Edit connector name',
              }
            ),
            onSave: onSaveTitle,
            placeholder: i18n.translate(
              'xpack.enterpriseSearch.content.connectors.nameAndDescription.name.placeholder',
              { defaultMessage: 'Add a name to your connector' }
            ),
            text: connector.name,
          }
        : '...',
    [connector, onSaveTitle]
  );

  const headerTabs = useMemo<AppHeaderTab[]>(
    () =>
      tabs.map((tab) => ({
        'data-test-subj': `enterpriseSearchConnectorDetail-${tab.id}Tab`,
        disabled: tab.disabled,
        href: tab.href,
        id: tab.id,
        isSelected: tab.isSelected,
        label: tab.label,
      })),
    [tabs]
  );

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...connectorsBreadcrumbs, connector?.name ?? '...']}
      pageViewTelemetry={tabId}
      isLoading={isLoading}
      appHeader={
        <AppHeader
          title={headerTitle}
          back={{
            href: getEnterpriseSearchContentUrl(CONNECTORS_PATH),
            label: i18n.translate('xpack.enterpriseSearch.content.connectors.breadcrumb', {
              defaultMessage: 'Connectors',
            }),
          }}
          tabs={headerTabs}
          menu={syncsMenu}
        />
      }
    >
      {selectedTab?.content || null}
    </EnterpriseSearchContentPageTemplate>
  );
};
