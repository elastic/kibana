/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../entity_analytics/components/ai_security/types';
import { AiAgentHeader } from './header';
import { AI_AGENT_TEST_IDS } from './test_ids';

jest.mock('../../../../entity_analytics/api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({
    data: [
      {
        id: 'agents-for-departing-employees',
        name: 'Agents acting for departing employees',
        riskModifier: 1.5,
      },
    ],
  }),
}));

const identity: AgentIdentity = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
};

const agent: AgentRow = {
  ...identity,
  hostName: 'ci-build-01',
  version: '2.1.332',
  watchlistIds: [],
  accountEmails: [],
  accountIds: [],
  dependsOnIds: [],
  dataSources: [],
};

const renderHeader = (props: Partial<React.ComponentProps<typeof AiAgentHeader>> = {}) =>
  render(
    <TestProviders>
      <AiAgentHeader identity={identity} agent={agent} isLoading={false} {...props} />
    </TestProviders>
  );

describe('AiAgentHeader', () => {
  it('titles the install with the agent, OS user and host name', () => {
    renderHeader();
    expect(screen.getByText('Claude Code · ec2-user@ci-build-01')).toBeInTheDocument();
    expect(screen.getByText('AI agent')).toBeInTheDocument();
  });

  it('shows no risk badge when the agent has no score', () => {
    renderHeader();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.riskBadge)).not.toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.header)).not.toHaveTextContent('Risk');
  });

  it('shows the normalised score and risk level once the agent is scored', () => {
    renderHeader({ agent: { ...agent, riskLevel: 'Moderate', riskScore: 64.7641 } });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.riskBadge)).toHaveTextContent(
      'Risk: 64.76 Moderate'
    );
  });

  it("names the agent's own watchlists, with the risk modifier in a tooltip", async () => {
    renderHeader({ agent: { ...agent, watchlistIds: ['agents-for-departing-employees'] } });
    const badge = screen.getByText('Agents acting for departing employees');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.headerWatchlist)).toContainElement(badge);
    fireEvent.mouseOver(badge);
    await waitFor(() => expect(screen.getByText('Risk modifier 1.5')).toBeInTheDocument());
  });

  it('renders nothing for watchlists when the agent is on none', () => {
    renderHeader();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.headerWatchlist)).not.toBeInTheDocument();
    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('shows when the agent was last seen as relative time', () => {
    renderHeader({
      agent: { ...agent, lastSeen: new Date(Date.now() - 12 * 3_600_000).toISOString() },
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.lastSeen)).toHaveTextContent(
      'Last seen 12 hours ago'
    );
  });

  it('keeps version and lifecycle dates out of the header', () => {
    renderHeader({ agent: { ...agent, firstSeen: '2026-11-20T10:00:00.000Z' } });
    expect(screen.queryByText('2.1.332')).not.toBeInTheDocument();
    expect(screen.queryByText('First seen')).not.toBeInTheDocument();
  });

  it('falls back to the install ID fields when there is no store row', () => {
    renderHeader({ agent: undefined });
    expect(screen.getByText('Claude Code · ec2-user@host-1')).toBeInTheDocument();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.lastSeen)).not.toBeInTheDocument();
  });
});
