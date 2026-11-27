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
} from '../../../../entity_analytics/components/ai_security/types';
import { getUnsanctionedAiAgentsWatchlistSavedObjectId } from '../../../../../common/entity_analytics/watchlists/constants';
import { AiAgentHeader, isUnsanctionedAgent } from './header';
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

  it('shows the risk level without the score once the agent is scored', () => {
    renderHeader({ agent: { ...agent, riskLevel: 'High', riskScore: 73.3812 } });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.riskBadge)).toHaveTextContent('Risk: High');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.header)).not.toHaveTextContent('73.38');
  });

  it("keeps the agent's watchlists out of the header", () => {
    renderHeader({ agent: { ...agent, watchlistIds: ['agents-for-departing-employees'] } });
    expect(screen.queryByText('Agents acting for departing employees')).not.toBeInTheDocument();
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

  it('shows the Unsanctioned and Running now pills next to the others', () => {
    renderHeader({ isUnsanctioned: true, isRunning: true });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.unsanctionedBadge)).toHaveTextContent(
      'Unsanctioned'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.headerRunning)).toHaveTextContent('Running now');
  });

  it('shows neither pill by default', () => {
    renderHeader();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.unsanctionedBadge)).not.toBeInTheDocument();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.headerRunning)).not.toBeInTheDocument();
  });

  it('recognises the Unsanctioned AI agents watchlist by its ID in the space', () => {
    const watchlistId = getUnsanctionedAiAgentsWatchlistSavedObjectId('gen-demo');
    expect(isUnsanctionedAgent({ ...agent, watchlistIds: [watchlistId] }, 'gen-demo')).toBe(true);
    expect(isUnsanctionedAgent({ ...agent, watchlistIds: [watchlistId] }, 'default')).toBe(false);
    expect(isUnsanctionedAgent(agent, 'gen-demo')).toBe(false);
    expect(isUnsanctionedAgent(undefined, 'gen-demo')).toBe(false);
  });

  it('falls back to the install ID fields when there is no store row', () => {
    renderHeader({ agent: undefined });
    expect(screen.getByText('Claude Code · ec2-user@host-1')).toBeInTheDocument();
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.lastSeen)).not.toBeInTheDocument();
  });
});
