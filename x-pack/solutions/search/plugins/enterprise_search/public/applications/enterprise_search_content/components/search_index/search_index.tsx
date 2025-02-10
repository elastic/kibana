/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiSpacer, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ClientConfigType } from '../../../../../common/types';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { SEARCH_INDEX_PATH, SEARCH_INDEX_TAB_PATH } from '../../routes';

import { ElasticsearchViewIndex } from '../../types';
import { isConnectorIndex } from '../../utils/indices';
import { ConnectorConfiguration } from '../connector_detail/connector_configuration';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { baseBreadcrumbs } from '../search_indices';

import { getHeaderActions } from '../shared/header_actions/header_actions';

import { ConnectorScheduling } from './connector/connector_scheduling';
import { ConnectorSyncRules } from './connector/sync_rules/connector_rules';
import { SearchIndexDocuments } from './documents';
import { IndexError } from './index_error';
import { SearchIndexIndexMappings } from './index_mappings';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';
import { SearchIndexOverview } from './overview';
import { SearchIndexPipelines } from './pipelines/pipelines';

export enum SearchIndexTabId {
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

export const SearchIndex: React.FC = () => {
  const { hasFilteringFeature, index, isInitialLoading } = useValues(IndexViewLogic);

  const { tabId = SearchIndexTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const { indexName } = useValues(IndexNameLogic);

  /**
   * Guided Onboarding needs us to mark the add data step as complete as soon as the user has data in an index.
   * This needs to be checked for any of the 3 registered search guideIds
   * Putting it here guarantees that if a user is viewing an index with data, it'll be marked as complete
   */
  const {
    config,
    guidedOnboarding,
    productFeatures: { hasDefaultIngestPipeline },
    updateSideNavDefinition,
  } = useValues(KibanaLogic);

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('websiteSearch', 'add_data')
      .subscribe((isStepActive) => {
        if (isStepActive && index?.count) {
          guidedOnboarding?.guidedOnboardingApi?.completeGuideStep('websiteSearch', 'add_data');
        }
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding, index?.count]);

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('databaseSearch', 'add_data')
      .subscribe((isStepActive) => {
        if (isStepActive && index?.count) {
          guidedOnboarding.guidedOnboardingApi?.completeGuideStep('databaseSearch', 'add_data');
        }
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding, index?.count]);

  useEffect(() => {
    return () => {
      updateSideNavDefinition({ indices: undefined });
    };
  }, [updateSideNavDefinition]);

  const ALL_INDICES_TABS: EuiTabbedContentTab[] = [
    {
      content: <SearchIndexOverview />,
      'data-test-subj': 'entSearchContent-index-overview-tab',
      id: SearchIndexTabId.OVERVIEW,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      content: (
        <>
          <EuiSpacer size="l" />
          <SearchIndexDocuments />
        </>
      ),
      id: SearchIndexTabId.DOCUMENTS,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.documentsTabLabel', {
        defaultMessage: 'Documents',
      }),
    },
    {
      content: (
        <>
          <EuiSpacer size="l" />
          <SearchIndexIndexMappings />
        </>
      ),
      id: SearchIndexTabId.INDEX_MAPPINGS,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.indexMappingsTabLabel', {
        defaultMessage: 'Mappings',
      }),
    },
  ];

  const CONNECTOR_TABS: EuiTabbedContentTab[] = [
    {
      content: (
        <>
          <EuiSpacer size="l" />
          <ConnectorConfiguration />
        </>
      ),
      id: SearchIndexTabId.CONFIGURATION,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.configurationTabLabel', {
        defaultMessage: 'Configuration',
      }),
    },
    ...(hasFilteringFeature
      ? [
          {
            content: (
              <>
                <EuiSpacer size="l" />
                <ConnectorSyncRules />
              </>
            ),
            id: SearchIndexTabId.SYNC_RULES,
            name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.syncRulesTabLabel', {
              defaultMessage: 'Sync rules',
            }),
          },
        ]
      : []),
    {
      content: (
        <>
          <EuiSpacer size="l" />
          <ConnectorScheduling />
        </>
      ),
      id: SearchIndexTabId.SCHEDULING,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.schedulingTabLabel', {
        defaultMessage: 'Scheduling',
      }),
    },
  ];

  const PIPELINES_TAB: EuiTabbedContentTab = {
    content: (
      <>
        <EuiSpacer size="l" />
        <SearchIndexPipelines />
      </>
    ),
    id: SearchIndexTabId.PIPELINES,
    name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.pipelinesTabLabel', {
      defaultMessage: 'Pipelines',
    }),
  };

  const tabs: EuiTabbedContentTab[] = [
    ...ALL_INDICES_TABS,
    ...(isConnectorIndex(index) ? CONNECTOR_TABS : []),
    ...(hasDefaultIngestPipeline ? [PIPELINES_TAB] : []),
  ];

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName]}
      pageViewTelemetry={tabId}
      isLoading={isInitialLoading}
      pageHeader={{
        pageTitle: indexName,
        rightSideGroupProps: {
          responsive: false,
        },
        rightSideItems: getHeaderActions(index),
      }}
    >
      <IndexError indexName={indexName} />
      <Content index={index} config={config} tabs={tabs} tabId={tabId} />
    </EnterpriseSearchContentPageTemplate>
  );
};

interface ContentProps {
  config?: ClientConfigType;
  index?: ElasticsearchViewIndex;
  tabId?: string;
  tabs: EuiTabbedContentTab[];
}

const Content: React.FC<ContentProps> = ({ index, tabs, tabId }) => {
  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabId]);

  const onTabClick = (tab: EuiTabbedContentTab) => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(
        tab.id === SearchIndexTabId.OVERVIEW ? SEARCH_INDEX_PATH : SEARCH_INDEX_TAB_PATH,
        {
          indexName: index?.name || '',
          tabId: tab.id,
        }
      )
    );
  };

  return (
    <EuiTabbedContent size="l" tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
  );
};
