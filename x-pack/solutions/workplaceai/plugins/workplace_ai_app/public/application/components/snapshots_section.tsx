/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { DATA_SOURCES_APP_ID } from '@kbn/deeplinks-data-sources';
import type { AgentConfiguration, ToolSelection } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_AGENTS } from '../../../common';
import { useAgents } from '../hooks/use_agents';
import { useKibana } from '../hooks/use_kibana';
import { useNavigateToApp } from '../hooks/use_navigate_to_app';
import salesForceSVG from '../../assets/salesforce.svg';
import googleDriveSVG from '../../assets/google_drive.svg';
import confluenceSVG from '../../assets/confluence.svg';

const MAX_DISPLAY_ITEMS = 4;
const CARD_MIN_HEIGHT = '320px';

const cardContainerStyles = css`
  height: 100%;
`;

const cardStyles = css`
  height: 100%;
  min-height: ${CARD_MIN_HEIGHT};
`;

// Hardcoded sources data
const allSources = [
  {
    name: 'Salesforce',
    status: 'Syncing',
    icon: salesForceSVG,
  },
  {
    name: 'Google Drive',
    status: 'Sync error',
    icon: googleDriveSVG,
  },
  {
    name: 'Confluence',
    status: 'Up to date',
    icon: confluenceSVG,
  },
  {
    name: 'Slack',
    status: 'Syncing',
    icon: salesForceSVG,
  },
  {
    name: 'Jira',
    status: 'Up to date',
    icon: confluenceSVG,
  },
  {
    name: 'SharePoint',
    status: 'Up to date',
    icon: googleDriveSVG,
  },
];

export const SnapshotsSection: React.FC = () => {
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents();
  const {
    services: { application, chrome },
  } = useKibana();
  const navigateToApp = useNavigateToApp();

  const agentCount = agents.length;
  const sourceCount = allSources.length;
  const syncingCount = allSources.filter((s) => s.status === 'Syncing').length;

  const getAgentEditUrl = useCallback(
    (agentId: string) => {
      const agentsBaseUrl = chrome?.navLinks.get(
        `${AGENT_BUILDER_APP_ID}:${AGENT_BUILDER_AGENTS}`
      )?.url;
      return agentsBaseUrl ? `${agentsBaseUrl}/${agentId}/edit` : undefined;
    },
    [chrome]
  );

  return (
    <div>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.workplaceai.gettingStarted.snapshots.title"
            defaultMessage="My Usage Snapshots"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" alignItems="stretch">
        <EuiFlexItem css={cardContainerStyles}>
          <EuiPanel paddingSize="m" css={cardStyles}>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.myAgentsTitle"
                  defaultMessage="My Agents"
                />
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.activeAgentsCount"
                  defaultMessage="{agentCount} active agent(s)"
                  values={{ agentCount }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={agents.slice(0, MAX_DISPLAY_ITEMS)}
              loading={isLoadingAgents}
              tableCaption={i18n.translate(
                'xpack.workplaceai.gettingStarted.snapshots.myAgentsTableCaption',
                {
                  defaultMessage: 'My agents list',
                }
              )}
              columns={[
                {
                  field: 'name',
                  name: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.agentNameColumn',
                    {
                      defaultMessage: 'Agent name',
                    }
                  ),
                  render: (name: string, agent: any) => {
                    const editUrl = getAgentEditUrl(agent.id);
                    return editUrl ? (
                      <a
                        href={editUrl}
                        onClick={(e) => {
                          e.preventDefault();
                          application?.navigateToUrl(editUrl);
                        }}
                      >
                        {name}
                      </a>
                    ) : (
                      <span>{name}</span>
                    );
                  },
                },
                {
                  field: 'configuration',
                  name: i18n.translate('xpack.workplaceai.gettingStarted.snapshots.toolsColumn', {
                    defaultMessage: 'Tools',
                  }),
                  render: (configuration?: AgentConfiguration) => {
                    const toolCount =
                      configuration?.tools?.reduce(
                        (count: number, selection: ToolSelection) =>
                          count + (selection.tool_ids?.length ?? 0),
                        0
                      ) ?? 0;
                    return toolCount;
                  },
                },
              ]}
            />
            {agentCount > MAX_DISPLAY_ITEMS && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      onClick={() =>
                        navigateToApp(`${AGENT_BUILDER_APP_ID}:${AGENT_BUILDER_AGENTS}`)
                      }
                    >
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.snapshots.seeAllAgents"
                        defaultMessage="See all"
                      />
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem css={cardContainerStyles}>
          <EuiPanel paddingSize="m" css={cardStyles}>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.mySourcesTitle"
                  defaultMessage="My sources"
                />
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.connectedSourcesStatus"
                  defaultMessage="{sourceCount} connected sources · {syncingCount} syncing now"
                  values={{ sourceCount, syncingCount }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              tableCaption={i18n.translate(
                'xpack.workplaceai.gettingStarted.snapshots.mySourcesTableCaption',
                {
                  defaultMessage: 'My sources list',
                }
              )}
              items={allSources.slice(0, MAX_DISPLAY_ITEMS)}
              columns={[
                {
                  field: 'name',
                  name: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.sourceNameColumn',
                    {
                      defaultMessage: 'Source name',
                    }
                  ),
                  render: (name: string, item: { icon: string }) => (
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type={item.icon} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiLink onClick={() => {}}>{name}</EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                },
                {
                  field: 'status',
                  name: i18n.translate('xpack.workplaceai.gettingStarted.snapshots.statusColumn', {
                    defaultMessage: 'Status',
                  }),
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
            {sourceCount > MAX_DISPLAY_ITEMS && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiLink onClick={() => navigateToApp(DATA_SOURCES_APP_ID)}>
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.snapshots.seeAllSources"
                        defaultMessage="See all"
                      />
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem css={cardContainerStyles}>
          <EuiPanel paddingSize="m" css={cardStyles}>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.usageSnapshotTitle"
                  defaultMessage="Chat Activities"
                />
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.noRecentActivity"
                  defaultMessage="No recent activity yet. Try a query in WorkChat."
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              tableCaption={i18n.translate(
                'xpack.workplaceai.gettingStarted.snapshots.chatActivitiesTableCaption',
                {
                  defaultMessage: 'Chat activities metrics',
                }
              )}
              items={[
                {
                  metric: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.totalQueriesMetric',
                    {
                      defaultMessage: 'Total queries',
                    }
                  ),
                  value: '124',
                },
                {
                  metric: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.agentRunsMetric',
                    {
                      defaultMessage: 'Agent runs',
                    }
                  ),
                  value: '45',
                },
                {
                  metric: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.taskSuccessMetric',
                    {
                      defaultMessage: 'Task success',
                    }
                  ),
                  value: '92%',
                },
              ]}
              columns={[
                {
                  field: 'metric',
                  name: i18n.translate('xpack.workplaceai.gettingStarted.snapshots.metricColumn', {
                    defaultMessage: 'Metric',
                  }),
                },
                {
                  field: 'value',
                  name: i18n.translate('xpack.workplaceai.gettingStarted.snapshots.valueColumn', {
                    defaultMessage: 'Value',
                  }),
                  align: 'right',
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
