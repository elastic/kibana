/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useIngestSampleData } from '../hooks/use_ingest_data';
import { useSampleDataStatus } from '../hooks/use_sample_data_status';
import { useKibana } from '../hooks/use_kibana';
import { useNavigateToDiscover } from '../hooks/use_navigate_to_discover';
import { useNavigateToDashboard } from '../hooks/use_navigate_to_dashboard';
import { AnalyticsEvents } from '../analytics/constants';
import { useUsageTracker } from '../hooks/use_usage_tracker';

export const SampleDataActionButton = ({ clickEvent = AnalyticsEvents.installSampleDataClick }) => {
  const usageTracker = useUsageTracker();
  const { ingestSampleData, isLoading } = useIngestSampleData();
  const { share, uiSettings } = useKibana().services;
  const { isInstalled, indexName, dashboardId, isLoading: isStatusLoading } = useSampleDataStatus();
  const [isShowViewDataOptions, setShowViewDataOptions] = useState(false);
  const isAgentBuilderAvailable = uiSettings.get<boolean>(AGENT_BUILDER_ENABLED_SETTING_ID, false);

  const onInstallButtonClick = useCallback(() => {
    usageTracker.click(clickEvent);
    ingestSampleData();
  }, [ingestSampleData, usageTracker, clickEvent]);
  const onViewButtonClick = useCallback(() => {
    setShowViewDataOptions(true);
  }, []);

  const onClosePopover = useCallback(() => {
    setShowViewDataOptions(false);
  }, []);

  const navigateToPlayground = useCallback(async () => {
    const playgroundLocator = share.url.locators.get('PLAYGROUND_LOCATOR_ID');
    const isSearchAvailable = uiSettings.get<boolean>('searchPlayground:searchModeEnabled', false);

    if (playgroundLocator && indexName) {
      await playgroundLocator.navigate({
        'default-index': indexName,
        search: isSearchAvailable,
      });
    }
  }, [share, uiSettings, indexName]);

  const navigateToDiscover = useNavigateToDiscover(indexName || '');
  const navigateToDashboard = useNavigateToDashboard(dashboardId);

  const navigateToIndexDetails = useCallback(async () => {
    const indexDetailsLocator = share.url.locators.get('SEARCH_INDEX_DETAILS_LOCATOR_ID');
    if (indexDetailsLocator && indexName) {
      await indexDetailsLocator.navigate({ indexName });
    }
  }, [share, indexName]);

  const navigateToAgentBuilder = useCallback(async () => {
    if (isAgentBuilderAvailable) {
      const agentBuilderLocator = share.url.locators.get('AGENT_BUILDER_LOCATOR_ID');
      await agentBuilderLocator?.navigate({});
    }
  }, [share, isAgentBuilderAvailable]);

  if (isStatusLoading) {
    return null;
  }

  if (isInstalled && indexName) {
    const button = (
      <EuiButton
        color="text"
        data-test-subj="viewDataBtn"
        size="s"
        iconType="arrowDown"
        iconSide="right"
        onClick={onViewButtonClick}
      >
        <FormattedMessage id="xpack.searchHomepage.sampleData.view" defaultMessage="View Data" />
      </EuiButton>
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isShowViewDataOptions}
          closePopover={onClosePopover}
          anchorPosition="downLeft"
          panelPaddingSize="s"
        >
          <EuiContextMenuPanel
            css={{ minWidth: 250 }}
            items={[
              ...(isAgentBuilderAvailable
                ? [
                    <EuiContextMenuItem
                      key="agentBuilder"
                      onClick={navigateToAgentBuilder}
                      icon="comment"
                      data-test-subj="agentBuilderMenuItem"
                    >
                      <FormattedMessage
                        id="xpack.searchHomepage.shared.createIndex.ingestSampleData.linkToAgentBuilder"
                        defaultMessage="Agents"
                      />
                    </EuiContextMenuItem>,
                  ]
                : []),
              <EuiContextMenuItem key="discover" onClick={navigateToDiscover} icon="discoverApp">
                <FormattedMessage
                  id="xpack.searchHomepage.sampleData.linkToDiscover"
                  defaultMessage="Discover"
                />
              </EuiContextMenuItem>,
              ...(dashboardId
                ? [
                    <EuiContextMenuItem
                      key="dashboard"
                      onClick={navigateToDashboard}
                      icon="dashboardApp"
                    >
                      <FormattedMessage
                        id="xpack.searchHomepage.createIndex.ingestSampleData.linkToDashboard"
                        defaultMessage="Dashboard"
                      />
                    </EuiContextMenuItem>,
                  ]
                : []),
              <EuiContextMenuItem key="playground" onClick={navigateToPlayground} icon="comment">
                <FormattedMessage
                  id="xpack.searchHomepage.sampleData.linkToPlayground"
                  defaultMessage="Playground"
                />
              </EuiContextMenuItem>,
              <EuiContextMenuItem key="index" onClick={navigateToIndexDetails} icon="index">
                <FormattedMessage
                  id="xpack.searchHomepage.sampleData.linkToIndex"
                  defaultMessage="View index"
                />
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    );
  }

  return (
    <EuiButton
      color="text"
      iconSide="left"
      iconType="download"
      size="s"
      data-test-subj="installSampleBtn"
      isLoading={isLoading}
      onClick={onInstallButtonClick}
    >
      <FormattedMessage
        id="xpack.searchHomepage.sampleData.btn"
        defaultMessage="Sample knowledge base"
      />
    </EuiButton>
  );
};
