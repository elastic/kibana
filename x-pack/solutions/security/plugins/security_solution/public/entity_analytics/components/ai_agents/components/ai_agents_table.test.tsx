/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import type { AgentInventoryRow } from '../types';
import { AiAgentsTable, AI_AGENTS_TABLE_TEST_ID } from './ai_agents_table';

jest.mock('../../../api/hooks/use_get_watchlists', () => ({
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

const row = (overrides: Partial<AgentInventoryRow> & { entityId: string }): AgentInventoryRow => ({
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
  hostName: 'build-01',
  version: '2.1.332',
  firstSeen: '2026-11-26T10:00:00.000Z',
  lastSeen: '2026-11-26T11:00:00.000Z',
  watchlistIds: [],
  accountEmails: ['alex@example.com'],
  accountIds: [],
  dependsOnIds: [],
  dataSources: [],
  alertCount: 0,
  ...overrides,
});

const rows: AgentInventoryRow[] = [
  row({
    entityId: 'ai_agent:claude_code@host-1@ec2-user',
    alertCount: 3,
    riskLevel: 'High',
    riskScore: 72,
    watchlistIds: ['agents-for-departing-employees'],
  }),
  row({
    entityId: 'ai_agent:cursor@host-2@jenkins',
    agentName: 'cursor',
    hostId: 'host-2',
    hostName: undefined,
    userName: 'jenkins',
    version: undefined,
    accountEmails: [],
  }),
  row({ entityId: 'ai_agent:claude_code@host-3@root', hostId: 'host-3', userName: 'root' }),
];

const renderTable = (onOpenAgent = jest.fn(), alertsUnavailable = false) => {
  render(
    <TestProviders>
      <AiAgentsTable
        rows={rows}
        loading={false}
        alertsUnavailable={alertsUnavailable}
        onOpenAgent={onOpenAgent}
      />
    </TestProviders>
  );
  return onOpenAgent;
};

describe('AiAgentsTable', () => {
  it('labels the OS user "Runs as" and shows the columns of an install', () => {
    renderTable();
    const table = screen.getByTestId(AI_AGENTS_TABLE_TEST_ID);
    expect(within(table).getAllByText('Runs as').length).toBeGreaterThan(0);
    expect(within(table).queryByText('Owner')).not.toBeInTheDocument();
    const claudeRow = screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user');
    expect(claudeRow).toHaveTextContent('Claude Code');
    expect(claudeRow).toHaveTextContent('build-01');
    expect(claudeRow).toHaveTextContent('alex@example.com');
    expect(claudeRow).toHaveTextContent('2.1.332');
    expect(claudeRow).toHaveTextContent('3');
    expect(claudeRow).toHaveTextContent('High');
  });

  it('copes with sparse rows: no host name, no version, no account and no score', () => {
    renderTable();
    const cursorRow = screen.getByTestId('aiAgentsTableRow-ai_agent:cursor@host-2@jenkins');
    expect(cursorRow).toHaveTextContent('host-2');
    expect(cursorRow).toHaveTextContent('Unknown');
    expect(cursorRow).toHaveTextContent('None seen');
    expect(cursorRow).toHaveTextContent('No score yet');
  });

  it("names each agent's own watchlists, and finds agents by watchlist name", () => {
    renderTable();
    expect(
      within(
        screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user')
      ).getByTestId('aiAgentsTableWatchlists')
    ).toHaveTextContent('Agents acting for departing employees');
    expect(
      within(screen.getByTestId('aiAgentsTableRow-ai_agent:cursor@host-2@jenkins')).queryByTestId(
        'aiAgentsTableWatchlists'
      )
    ).not.toBeInTheDocument();

    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'departing' } });
    fireEvent.keyUp(search, { target: { value: 'departing' } });
    expect(screen.getAllByTestId(/^aiAgentsTableRow-/)).toHaveLength(1);
  });

  it('opens the agent flyout from a row', () => {
    const onOpenAgent = renderTable();
    fireEvent.click(screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-3@root'));
    expect(onOpenAgent).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'ai_agent:claude_code@host-3@root' })
    );
  });
});
