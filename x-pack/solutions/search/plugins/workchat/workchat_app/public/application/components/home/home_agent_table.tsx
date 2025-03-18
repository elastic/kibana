/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { Agent } from '../../../../common/agents';
import { useNavigation } from '../../hooks/use_navigation';
import { useAgentList } from '../../hooks/use_agent_list';

export const HomeAgentTable: React.FC<{}> = () => {
  const { createWorkchatUrl } = useNavigation();
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

  return <EuiBasicTable columns={columns} items={agents} />;
};
