/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiPanel,
  EuiButtonIcon,
  EuiTextArea,
  EuiCard,
  EuiButton,
  EuiBasicTable,
  EuiBadge,
  EuiImage,
  EuiCodeBlock,
  EuiButtonEmpty,
} from '@elastic/eui';
import headerHeroSvg from '../../../assets/header_hero.svg';
import mcpEndpointSVG from '../../../assets/mcp_endpoint.svg';
import searchAnalyticsSVG from '../../../assets/search_analytics.svg';
import searchResultsSVG from '../../../assets/search_results_illustration.svg';
import searchWindowSVG from '../../../assets/search_window_illustration.svg';
import salesForceSVG from '../../../assets/salesforce.svg';
import confluenceSVG from '../../../assets/confluence.svg';
import googleDriveSVG from '../../../assets/google_drive.svg';
import { useCurrentUser } from '../../hooks/use_current_user';

export const WorkplaceAIHomeView: React.FC<{}> = () => {
  const [chatInput, setChatInput] = useState('');
  const user = useCurrentUser();

  return (
    <KibanaPageTemplate data-test-subj="workplaceAIHomePage">
      <KibanaPageTemplate.Section restrictWidth={true} paddingSize="xl">
        <EuiSpacer size="l" />

        {/* Header Section with Hero Image */}
        <EuiFlexGroup alignItems="center" gutterSize="xl">
          <EuiFlexItem grow={6}>
            <EuiTitle size="l">
              <h1>Welcome, {user?.full_name || user?.username || 'User'}</h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="m">
              <p>
                Connect data, create agents, and automate workflows powered by your enterprise
                knowledge.
              </p>
            </EuiText>
            <EuiSpacer size="xxl" />

            {/* Configuration Buttons Row */}
            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={false} justifyContent="center">
                <EuiCodeBlock isCopyable transparentBackground paddingSize="none" fontSize="m">
                  elastic.deployment.url
                </EuiCodeBlock>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={false}
                  color="text"
                  size="s"
                  iconType="key"
                  iconSide="left"
                  onClick={() => {}}
                >
                  API key
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={false}
                  color="text"
                  size="s"
                  iconType={mcpEndpointSVG}
                  iconSide="left"
                  onClick={() => {}}
                >
                  MCP Endpoint
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill={false}
                  color="text"
                  size="s"
                  iconType="gear"
                  iconSide="left"
                  onClick={() => {}}
                >
                  Connection settings
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Hero Illustration */}
          <EuiFlexItem grow={4}>
            <EuiImage src={headerHeroSvg} alt="Workplace AI Hero" size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Explore default Elastic agent Card */}
        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h5>Explore default Elastic agent</h5>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
            {/* Add context button */}
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton size="s" iconType="at" color="text" onClick={() => {}}>
                  Add context
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {/* Input text area */}
            <EuiTextArea
              placeholder="How can I help you today?"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={3}
              resize="none"
              fullWidth
              style={{ border: 'none', boxShadow: 'none', padding: 0 }}
            />

            <EuiSpacer size="m" />

            {/* Bottom row: Modify and Tools on left, Submit arrow on right */}
            <EuiFlexGroup
              gutterSize="s"
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="m"
                      iconType="link"
                      color="text"
                      iconSize="m"
                      onClick={() => {}}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="m"
                      iconType="pencil"
                      color="text"
                      iconSize="m"
                      iconSide="left"
                      onClick={() => {}}
                    >
                      Modify
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="m"
                      iconType="grid"
                      color="text"
                      iconSize="m"
                      iconSide="left"
                      onClick={() => {}}
                    >
                      Tools
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowUp"
                  aria-label="Submit"
                  color="primary"
                  display="fill"
                  size="m"
                  disabled={chatInput.trim() === ''}
                  onClick={() => {}}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPanel>

        <EuiSpacer size="xl" />

        {/* Explore Workplace AI - Three Cards */}
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

        <EuiSpacer size="xl" />

        {/* Snapshots Section - Three Tables */}
        <div>
          <EuiTitle size="s">
            <h2>Snapshots</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="l" alignItems="flexStart">
            {/* My Agents Table */}
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiTitle size="xs">
                  <h3>My Agents</h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>1 active agent · Last created 3 days ago</p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  items={[
                    { name: 'SupportAgent', type: 'Retrieval QA', status: 'Active' },
                    { name: 'SalesAgent', type: 'Summarization', status: 'Training' },
                    { name: 'TestAgent', type: 'Query', status: 'Active' },
                  ]}
                  columns={[
                    {
                      field: 'name',
                      name: 'Agent name',
                      render: (name: string) => <a href="#">{name}</a>,
                    },
                    { field: 'type', name: 'Type' },
                    {
                      field: 'status',
                      name: 'Status',
                      render: (status: string) => (
                        <EuiBadge
                          color={
                            status === 'Active'
                              ? 'success'
                              : status === 'Training'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {status}
                        </EuiBadge>
                      ),
                    },
                  ]}
                />
              </EuiPanel>
            </EuiFlexItem>

            {/* My sources Table */}
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiTitle size="xs">
                  <h3>My sources</h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>3 connected sources · 2 syncing now</p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  items={[
                    { name: 'Salesforce', status: 'Syncing', icon: salesForceSVG },
                    { name: 'Google Drive', status: 'Sync error', icon: googleDriveSVG },
                    { name: 'Confluence', status: 'Up to date', icon: confluenceSVG },
                  ]}
                  columns={[
                    {
                      field: 'name',
                      name: 'Source name',
                      render: (name: string, item: any) => (
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type={item.icon} />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <a href="#">{name}</a>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ),
                    },
                    {
                      field: 'status',
                      name: 'Status',
                      render: (status: string) => (
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          {status === 'Sync error' && (
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="alert" color="danger" />
                            </EuiFlexItem>
                          )}
                          <EuiFlexItem>
                            <EuiText size="s">{status}</EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ),
                    },
                  ]}
                />
              </EuiPanel>
            </EuiFlexItem>

            {/* Usage snapshot Table */}
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiTitle size="xs">
                  <h3>Usage snapshot</h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>No recent activity yet. Try a query in WorkChat.</p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiBasicTable
                  items={[
                    { metric: 'Total queries', value: '124' },
                    { metric: 'Agent runs', value: '45' },
                    { metric: 'Task success', value: '92%' },
                  ]}
                  columns={[
                    { field: 'metric', name: 'Source name' },
                    { field: 'value', name: 'Status', align: 'right' },
                  ]}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <EuiSpacer size="xl" />

        {/* Bottom Action Cards */}
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel paddingSize="l">
              <EuiTitle size="xs">
                <h5>Browse dashboards</h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>Learn how to create dashboards to Measure adoption, trust, and performance.</p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton color="text" onClick={() => {}}>
                Explore dashboards
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel paddingSize="l">
              <EuiTitle size="xs">
                <h5>Use a workflow template</h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>Try prebuilt automations (e.g., summarize tickets, draft status reports).</p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton color="text" onClick={() => {}}>
                Browse templates
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xl" />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
