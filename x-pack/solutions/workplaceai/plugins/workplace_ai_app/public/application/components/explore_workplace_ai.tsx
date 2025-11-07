/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiCard, EuiButton, EuiIcon } from '@elastic/eui';
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
        <h4>Explore Workplace AI</h4>
      </EuiTitle>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type={searchWindowSVG} size="xl" />}
            title="Connect data sources"
            description="Learn how to integrate apps like Salesforce, Google Drive, and Confluence."
            footer={
              <EuiButton color="text" onClick={onConnectSource}>
                Connect a source
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type={searchAnalyticsSVG} size="xl" />}
            title="Create your first agent"
            description="Build an intelligent agent using your connected data."
            footer={
              <EuiButton color="text" onClick={onCreateAgent}>
                Create an agent
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type={searchResultsSVG} size="xl" />}
            title="Chat with default agent"
            description="Ask questions grounded in your business data."
            footer={
              <EuiButton color="text" onClick={onChatNow}>
                Chat now
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
