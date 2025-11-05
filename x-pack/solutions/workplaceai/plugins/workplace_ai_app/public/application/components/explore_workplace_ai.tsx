/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiCard, EuiButton, EuiIcon } from '@elastic/eui';
import searchWindowSVG from '../../assets/search_window_illustration.svg';
import searchAnalyticsSVG from '../../assets/search_analytics.svg';
import searchResultsSVG from '../../assets/search_results_illustration.svg';

export const ExploreWorkplaceAI: React.FC = () => {
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
              <EuiButton color="text" onClick={() => {}}>
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
              <EuiButton color="text" onClick={() => {}}>
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
              <EuiButton color="text" onClick={() => {}}>
                Chat now
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
