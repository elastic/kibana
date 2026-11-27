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
import { mockInventoryRow as row, mockPerson } from './test_utils';

const UNSANCTIONED_ID = 'unsanctioned-ai-agents-watchlist-id-default';

jest.mock('../../../api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({
    data: [
      {
        id: 'agents-for-departing-employees',
        name: 'Agents acting for departing employees',
        riskModifier: 1.5,
      },
      { id: 'unsanctioned-ai-agents-watchlist-id-default', name: 'Unsanctioned AI agents' },
    ],
  }),
}));

const alex = mockPerson({
  entityId: 'user:alex@okta',
  name: 'Alex Doe',
  emails: ['alex@example.com'],
});

const rows: AgentInventoryRow[] = [
  row({
    entityId: 'ai_agent:claude_code@host-1@ec2-user',
    alertCount: 3,
    riskLevel: 'High',
    riskScore: 72,
    watchlistIds: ['agents-for-departing-employees', UNSANCTIONED_ID],
    accountEmails: ['alex@example.com'],
    accounts: [{ person: alex, emails: ['alex@example.com'] }],
    storeContext: {
      personWatchlistIds: [],
      hostCriticality: 'extreme_impact',
      computedAt: '2026-11-26T11:00:00.000Z',
    },
  }),
  row({
    entityId: 'ai_agent:cursor@host-2@jenkins',
    agentName: 'cursor',
    hostId: 'host-2',
    hostName: undefined,
    userName: 'jenkins',
    version: undefined,
  }),
  row({
    entityId: 'ai_agent:claude_code@host-3@root',
    hostId: 'host-3',
    userName: 'root',
    alertCount: 1,
    accountEmails: ['kim@personal.example'],
    accounts: [{ emails: ['kim@personal.example'] }],
  }),
];

const renderTable = (tableRows = rows, onOpenAgent = jest.fn()) => {
  render(
    <TestProviders>
      <AiAgentsTable
        rows={tableRows}
        loading={false}
        alertsUnavailable={false}
        unsanctionedWatchlistId={UNSANCTIONED_ID}
        onOpenAgent={onOpenAgent}
      />
    </TestProviders>
  );
  return onOpenAgent;
};

const rowIds = () =>
  screen
    .getAllByTestId(/^aiAgentsTableRow-/)
    .map((element) => element.getAttribute('data-test-subj'));

describe('AiAgentsTable', () => {
  it('labels the OS user "Runs as", names the risk column "Agent risk" and shows an install', () => {
    renderTable();
    const table = screen.getByTestId(AI_AGENTS_TABLE_TEST_ID);
    expect(within(table).getAllByText('Runs as').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Signed in as').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Agent risk').length).toBeGreaterThan(0);
    expect(within(table).queryByText('Owner')).not.toBeInTheDocument();
    const claudeRow = screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user');
    expect(claudeRow).toHaveTextContent('Claude Code');
    expect(claudeRow).toHaveTextContent('build-01');
    expect(claudeRow).toHaveTextContent('3');
    expect(claudeRow).toHaveTextContent('72');
  });

  it('sorts by agent risk, then open alerts, then last seen', () => {
    renderTable([
      row({ entityId: 'old-no-alerts', lastSeen: '2026-11-20T00:00:00.000Z' }),
      row({ entityId: 'recent-no-alerts', lastSeen: '2026-11-26T00:00:00.000Z' }),
      row({ entityId: 'alerts', alertCount: 2, lastSeen: '2026-11-01T00:00:00.000Z' }),
      row({ entityId: 'zero-risk', riskScore: 0 }),
      row({ entityId: 'high-risk', riskScore: 80 }),
    ]);
    expect(rowIds()).toEqual([
      'aiAgentsTableRow-high-risk',
      'aiAgentsTableRow-zero-risk',
      'aiAgentsTableRow-alerts',
      'aiAgentsTableRow-recent-no-alerts',
      'aiAgentsTableRow-old-no-alerts',
    ]);
  });

  it('keeps Last seen sortable', () => {
    renderTable([
      row({ entityId: 'older', riskScore: 90, lastSeen: '2026-11-20T00:00:00.000Z' }),
      row({ entityId: 'newer', lastSeen: '2026-11-26T00:00:00.000Z' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Last seen/ }));
    expect(rowIds()).toEqual(['aiAgentsTableRow-older', 'aiAgentsTableRow-newer']);
    fireEvent.click(screen.getByRole('button', { name: /Last seen/ }));
    expect(rowIds()).toEqual(['aiAgentsTableRow-newer', 'aiAgentsTableRow-older']);
  });

  it("shows the resolved person's name, and the raw email when no person row exists", () => {
    renderTable();
    expect(
      within(
        screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user')
      ).getByTestId('aiAgentsTableSignedInAs')
    ).toHaveTextContent(/^Alex Doe$/);
    expect(
      within(screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-3@root')).getByTestId(
        'aiAgentsTableSignedInAs'
      )
    ).toHaveTextContent('kim@personal.example');
  });

  it('shows the first account and a count of the rest', () => {
    renderTable([
      row({
        entityId: 'ai_agent:claude_code@host-1@ec2-user',
        accounts: [
          { person: alex, emails: ['alex@example.com'] },
          { emails: ['sam@example.com'] },
          { emails: ['kim@example.com'] },
        ],
      }),
    ]);
    const claudeRow = screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user');
    expect(claudeRow).toHaveTextContent('Alex Doe');
    expect(claudeRow).toHaveTextContent('+2');
    expect(claudeRow).not.toHaveTextContent('sam@example.com');
  });

  it('marks an install on the Unsanctioned watchlist, and keeps the watchlist in its column', () => {
    renderTable();
    const claudeRow = screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user');
    expect(within(claudeRow).getByTestId('aiAgentsTableUnsanctionedBadge')).toHaveTextContent(
      'Unsanctioned'
    );
    expect(within(claudeRow).getByTestId('aiAgentsTableWatchlists')).toHaveTextContent(
      'Agents acting for departing employees'
    );
    expect(
      within(screen.getByTestId('aiAgentsTableRow-ai_agent:cursor@host-2@jenkins')).queryByTestId(
        'aiAgentsTableUnsanctionedBadge'
      )
    ).not.toBeInTheDocument();
  });

  it('shows host criticality as a dot in the Host cell, only when assigned', () => {
    renderTable();
    expect(
      within(
        screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-1@ec2-user')
      ).getByTestId('aiAgentsTableHostCriticality')
    ).toHaveAttribute('aria-label', 'Host criticality: Extreme Impact');
    expect(
      within(screen.getByTestId('aiAgentsTableRow-ai_agent:cursor@host-2@jenkins')).queryByTestId(
        'aiAgentsTableHostCriticality'
      )
    ).not.toBeInTheDocument();
  });

  it('copes with sparse rows: no host name, no account and no score', () => {
    renderTable();
    const cursorRow = screen.getByTestId('aiAgentsTableRow-ai_agent:cursor@host-2@jenkins');
    expect(cursorRow).toHaveTextContent('host-2');
    expect(within(cursorRow).queryByTestId('aiAgentsTableWatchlists')).not.toBeInTheDocument();
  });

  it('opens the agent flyout from a row', () => {
    const onOpenAgent = renderTable();
    fireEvent.click(screen.getByTestId('aiAgentsTableRow-ai_agent:claude_code@host-3@root'));
    expect(onOpenAgent).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'ai_agent:claude_code@host-3@root' })
    );
  });
});
