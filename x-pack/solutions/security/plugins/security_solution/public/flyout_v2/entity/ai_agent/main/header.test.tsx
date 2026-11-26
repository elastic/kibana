/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../entity_analytics/components/ai_agents/types';
import { AiAgentHeader } from './header';
import { AI_AGENT_TEST_IDS } from './test_ids';

const identity: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};

const agent: AgentRow = {
  ...identity,
  hostName: 'build-01',
  version: '2.1.332',
  watchlistIds: [],
  accountEmails: [],
  accountIds: [],
  dependsOnIds: [],
  dataSources: [],
};

describe('AiAgentHeader', () => {
  it('says there is no score yet when the agent has no risk', () => {
    render(
      <TestProviders>
        <AiAgentHeader identity={identity} agent={agent} isLoading={false} />
      </TestProviders>
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.noScoreBadge)).toHaveTextContent('no score yet');
    expect(screen.getByText('Not signed in yet')).toBeInTheDocument();
    expect(screen.getByText('2.1.332')).toBeInTheDocument();
  });

  it('shows the risk level once the agent is scored', () => {
    render(
      <TestProviders>
        <AiAgentHeader
          identity={identity}
          agent={{ ...agent, riskLevel: 'High', riskScore: 72 }}
          signedInAs="alex@example.com"
          isLoading={false}
        />
      </TestProviders>
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.riskBadge)).toHaveTextContent('Risk: High');
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('falls back to the install ID fields when there is no store row', () => {
    render(
      <TestProviders>
        <AiAgentHeader identity={identity} isLoading={false} />
      </TestProviders>
    );
    expect(screen.getByText('Claude Code · ec2-user@host-1')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
