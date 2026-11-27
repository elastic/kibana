/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AiAgentsGroups } from './ai_agents_groups';
import type { AgentGroupByOption } from './agent_groups';
import { mockInventoryRow as row, mockPerson } from './test_utils';

jest.mock('../../../api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({
    data: [{ id: 'departing', name: 'Departing employees' }],
  }),
}));

const avery = mockPerson({
  entityId: 'user:avery@okta',
  name: 'Avery Quinn',
  emails: ['avery@example.com'],
  watchlistIds: ['departing'],
});

const rows = [
  row({
    entityId: 'avery-laptop',
    hostId: 'laptop',
    hostName: 'laptop-01',
    riskScore: 64,
    alertCount: 2,
    accounts: [{ person: avery, emails: ['avery@example.com'] }],
  }),
  row({
    entityId: 'avery-runner',
    hostId: 'runner',
    hostName: 'ci-runner',
    alertCount: 1,
    accounts: [
      { person: avery, emails: ['avery@example.com'] },
      { emails: ['kim@personal.example'] },
    ],
    storeContext: {
      personWatchlistIds: ['departing'],
      hostCriticality: 'high_impact',
      computedAt: '2026-11-27T00:00:00.000Z',
    },
  }),
  row({ entityId: 'headless', hostId: 'runner', hostName: 'ci-runner' }),
];

const renderGroups = (groupBy: AgentGroupByOption, onOpenAgent = jest.fn()) => {
  render(
    <TestProviders>
      <AiAgentsGroups
        groupBy={groupBy}
        rows={rows}
        alertsUnavailable={false}
        unsanctionedWatchlistId="unsanctioned-ai-agents-watchlist-id-default"
        onOpenAgent={onOpenAgent}
      />
    </TestProviders>
  );
  return onOpenAgent;
};

describe('AiAgentsGroups', () => {
  it("heads a person group with the person's name, watchlists, installs, hosts, highest risk and alerts", () => {
    renderGroups('person');
    const group = screen.getByTestId('aiAgentsGroup-person:user:avery@okta');
    expect(group).toHaveTextContent('Avery Quinn');
    expect(within(group).getByTestId('aiAgentsGroupPersonWatchlists')).toHaveTextContent(
      'Departing employees'
    );
    expect(within(group).getByTestId('aiAgentsGroupInstalls')).toHaveTextContent('2');
    expect(within(group).getByTestId('aiAgentsGroupHosts')).toHaveTextContent('2');
    expect(within(group).getByTestId('aiAgentsGroupMaxRisk')).toHaveTextContent('64');
    expect(within(group).getByTestId('aiAgentsGroupAlerts')).toHaveTextContent('3');
  });

  it('labels an account with no person and installs with no account', () => {
    renderGroups('person');
    const unmatched = screen.getByTestId('aiAgentsGroup-email:kim@personal.example');
    expect(unmatched).toHaveTextContent('kim@personal.example');
    expect(unmatched).toHaveTextContent('No matching person');
    expect(screen.getByTestId('aiAgentsGroup-no-account')).toHaveTextContent(
      'No signed-in account'
    );
  });

  it("heads a host group with the host's name, criticality, agents and distinct people", () => {
    renderGroups('host');
    const group = screen.getByTestId('aiAgentsGroup-runner');
    expect(group).toHaveTextContent('ci-runner');
    expect(within(group).getByTestId('aiAgentsGroupHostCriticality')).toHaveTextContent(
      'High Impact'
    );
    expect(within(group).getByTestId('aiAgentsGroupInstalls')).toHaveTextContent('2');
    expect(within(group).getByTestId('aiAgentsGroupPeople')).toHaveTextContent('2');
  });

  it("shows a group's installs in the agents table, which opens the flyout", () => {
    const onOpenAgent = renderGroups('host');
    const table = screen.getByTestId('aiAgentsGroupTable-laptop');
    fireEvent.click(within(table).getByTestId('aiAgentsTableRow-avery-laptop'));
    expect(onOpenAgent).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'avery-laptop' }));
  });
});
