/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiBadge,
  EuiIcon,
} from '@elastic/eui';
import salesForceSVG from '../../assets/salesforce.svg';
import googleDriveSVG from '../../assets/google_drive.svg';
import confluenceSVG from '../../assets/confluence.svg';

export const SnapshotsSection: React.FC = () => {
  return (
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
  );
};
