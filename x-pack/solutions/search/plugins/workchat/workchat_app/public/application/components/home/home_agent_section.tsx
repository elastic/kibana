/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Agent } from '../../../../common/agents';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';

export const HomeAgentSection: React.FC<{}> = () => {
  const { createWorkchatUrl, navigateToWorkchatUrl } = useNavigation();
  const { agents } = useAgentList();

  const columns: Array<EuiBasicTableColumn<Agent>> = [
    {
      field: 'name',
      name: 'Name',
      render: (value, agent) => {
        return <EuiLink href={createWorkchatUrl(`/agents/${agent.id}/chat`)}>{value}</EuiLink>;
      },
    },
    { field: 'description', name: 'Description' },
  ];

  return (
    <KibanaPageTemplate.Section>
      <EuiTitle size="s">
        <h4>Your agents</h4>
      </EuiTitle>
      <EuiSpacer />
      <EuiBasicTable columns={columns} items={agents} />
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              navigateToWorkchatUrl('/agents');
            }}
          >
            Go to agent management
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
