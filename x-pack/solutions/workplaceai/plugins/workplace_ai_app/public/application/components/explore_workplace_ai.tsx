/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiCard, EuiButton, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_APP_ID, AGENT_BUILDER_AGENTS_CREATE } from '@kbn/deeplinks-agent-builder';
import { DATA_CONNECTORS_APP_ID } from '@kbn/deeplinks-data-connectors';
import { useKibana } from '../hooks/use_kibana';
import searchWindowSVG from '../../assets/search_window_illustration.svg';
import searchAnalyticsSVG from '../../assets/search_analytics.svg';
import searchResultsSVG from '../../assets/search_results_illustration.svg';

export const ExploreWorkplaceAI: React.FC = () => {
  const {
    services: { application, chrome },
  } = useKibana();

  const onConnectSource = useCallback(() => {
    const dataConnectorsUrl = chrome?.navLinks.get(DATA_CONNECTORS_APP_ID)?.url;

    if (dataConnectorsUrl) {
      application?.navigateToUrl(dataConnectorsUrl);
    }
  }, [application, chrome]);

  const onCreateAgent = useCallback(() => {
    const createAgentUrl = chrome?.navLinks.get(
      `${AGENT_BUILDER_APP_ID}:${AGENT_BUILDER_AGENTS_CREATE}`
    )?.url;

    if (createAgentUrl) {
      application?.navigateToUrl(createAgentUrl);
    }
  }, [application, chrome]);

  const onChatNow = useCallback(() => {
    const agentBuilderUrl = chrome?.navLinks.get(AGENT_BUILDER_APP_ID)?.url;

    if (agentBuilderUrl) {
      application?.navigateToUrl(agentBuilderUrl);
    }
  }, [application, chrome]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.workplaceai.gettingStarted.exploreSection.title"
            defaultMessage="Explore Workplace AI"
          />
        </h2>
      </EuiTitle>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type={searchWindowSVG} size="xl" />}
            title={
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreSection.connectDataSourcesTitle"
                defaultMessage="Connect data sources"
              />
            }
            description={
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreSection.connectDataSourcesDescription"
                defaultMessage="Learn how to integrate apps like Salesforce, Google Drive, and Confluence."
              />
            }
            footer={
              <EuiButton color="text" onClick={onConnectSource}>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.exploreSection.connectSourceButtonLabel"
                  defaultMessage="Connect a source"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type={searchAnalyticsSVG} size="xl" />}
            title={
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreSection.createFirstAgentTitle"
                defaultMessage="Create your first agent"
              />
            }
            description={
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreSection.createFirstAgentDescription"
                defaultMessage="Build an intelligent agent using your connected data."
              />
            }
            footer={
              <EuiButton color="text" onClick={onCreateAgent}>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.exploreSection.createAgentButtonLabel"
                  defaultMessage="Create an agent"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type={searchResultsSVG} size="xl" />}
            title={
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreSection.chatWithAgentTitle"
                defaultMessage="Chat with default agent"
              />
            }
            description={
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreSection.chatWithAgentDescription"
                defaultMessage="Ask questions grounded in your business data."
              />
            }
            footer={
              <EuiButton color="text" onClick={onChatNow}>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.exploreSection.chatNowButtonLabel"
                  defaultMessage="Chat now"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
