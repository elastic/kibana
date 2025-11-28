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
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { AGENT_BUILDER_AGENTS } from '../../../common';
import { useAgents } from '../hooks/use_agents';
import { useKibana } from '../hooks/use_kibana';
import salesForceSVG from '../../assets/salesforce.svg';
import googleDriveSVG from '../../assets/google_drive.svg';
import confluenceSVG from '../../assets/confluence.svg';

export const SnapshotsSection: React.FC = () => {
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents();
  const {
    services: { application, chrome },
  } = useKibana();

  const agentCount = agents.length;

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
            defaultMessage="Snapshots"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
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
              items={agents.slice(0, 3)}
              loading={isLoadingAgents}
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
                  field: 'type',
                  name: i18n.translate('xpack.workplaceai.gettingStarted.snapshots.typeColumn', {
                    defaultMessage: 'Type',
                  }),
                  render: (type: string) => type || '-',
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
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
                  defaultMessage="3 connected sources · 2 syncing now"
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={[
                {
                  name: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.salesforceName',
                    {
                      defaultMessage: 'Salesforce',
                    }
                  ),
                  status: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.syncingStatus',
                    {
                      defaultMessage: 'Syncing',
                    }
                  ),
                  icon: salesForceSVG,
                },
                {
                  name: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.googleDriveName',
                    {
                      defaultMessage: 'Google Drive',
                    }
                  ),
                  status: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.syncErrorStatus',
                    {
                      defaultMessage: 'Sync error',
                    }
                  ),
                  icon: googleDriveSVG,
                },
                {
                  name: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.confluenceName',
                    {
                      defaultMessage: 'Confluence',
                    }
                  ),
                  status: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.upToDateStatus',
                    {
                      defaultMessage: 'Up to date',
                    }
                  ),
                  icon: confluenceSVG,
                },
              ]}
              columns={[
                {
                  field: 'name',
                  name: i18n.translate(
                    'xpack.workplaceai.gettingStarted.snapshots.sourceNameColumn',
                    {
                      defaultMessage: 'Source name',
                    }
                  ),
                  render: (name: string, item: any) => (
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
                      {status ===
                        i18n.translate(
                          'xpack.workplaceai.gettingStarted.snapshots.syncErrorStatus',
                          {
                            defaultMessage: 'Sync error',
                          }
                        ) && (
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

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.snapshots.usageSnapshotTitle"
                  defaultMessage="Usage snapshot"
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
