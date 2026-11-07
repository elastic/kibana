/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AgentInventory } from './agent_inventory';
import { useAgentInventory } from './use_agent_inventory';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import type { AgentInventoryItem, AgentInventoryResult } from './types';

jest.mock('./use_agent_inventory');
jest.mock('../../../../common/hooks/use_space_id');
jest.mock('./agent_dossier', () => ({
  AgentDossier: ({ agent }: { agent: AgentInventoryItem }) => (
    <div data-test-subj="selectedAgentDossier">{agent.id}</div>
  ),
}));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

const mockInventory = jest.mocked(useAgentInventory);
const mockSpaceId = jest.mocked(useSpaceId);
const agent: AgentInventoryItem = {
  id: 'agent-id',
  entityId: 'ai_agent:marketing:agent-id',
  name: 'Inventory agent',
  description: '',
  type: 'chat',
  readonly: false,
  configuredTools: [{ id: 'configured-tool', definitionAvailable: true }],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: ['agent-id'],
};
const inventory: AgentInventoryResult = {
  agents: [agent],
  status: 'partial',
  definitionsStatus: 'available',
  toolsStatus: 'available',
  activityStatus: 'unavailable',
  isLoading: false,
  isRefreshing: false,
  refetch: jest.fn(),
  lookbackDays: 30,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSpaceId.mockReturnValue('marketing');
  mockInventory.mockReturnValue(inventory);
});

it('shows missing invocation and last-observed metrics as dashes while retaining real configuration', () => {
  render(<AgentInventory onInvestigate={jest.fn()} />);
  const table = screen.getByRole('table');
  const row = within(table).getAllByRole('row')[1];
  const cells = within(row).getAllByRole('cell');
  expect(cells[1]).toHaveTextContent('1');
  expect(cells[3]).toHaveTextContent('—');
  expect(cells[4]).toHaveTextContent('—');
  expect(screen.getByText(/Some tool or activity information is unavailable/)).toBeInTheDocument();
  expect(screen.getByText('Agent risk is not scored yet')).toBeInTheDocument();
});

it('reports inaccessible inventory without presenting an empty or zero-agent inventory', () => {
  mockInventory.mockReturnValue({
    ...inventory,
    agents: [],
    status: 'unavailable',
    definitionsStatus: 'unavailable',
  });
  render(<AgentInventory onInvestigate={jest.fn()} />);
  expect(screen.getByText('Agent inventory unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText('0 registered agents')).not.toBeInTheDocument();
});

it('opens the selected agent dossier and sends its exact ID to Explorer', () => {
  const onInvestigate = jest.fn();
  render(<AgentInventory onInvestigate={onInvestigate} />);
  fireEvent.click(screen.getByTestId('agentInventoryExplore'));
  expect(onInvestigate).toHaveBeenCalledWith('agent-id');
  fireEvent.click(screen.getByTestId('agentInventoryName'));
  expect(screen.getByTestId('selectedAgentDossier')).toHaveTextContent('agent-id');
});

it('does not substitute default-space activity while the active space is unresolved', () => {
  mockSpaceId.mockReturnValue(undefined);
  render(<AgentInventory onInvestigate={jest.fn()} />);
  expect(mockInventory).toHaveBeenCalledWith(undefined);
});

it('hides an already selected dossier after definitions become unavailable even if stale agents remain', () => {
  const onInvestigate = jest.fn();
  const { rerender } = render(<AgentInventory onInvestigate={onInvestigate} />);
  fireEvent.click(screen.getByTestId('agentInventoryName'));
  expect(screen.getByTestId('selectedAgentDossier')).toBeInTheDocument();
  mockInventory.mockReturnValue({
    ...inventory,
    status: 'unavailable',
    definitionsStatus: 'unavailable',
  });
  rerender(<AgentInventory onInvestigate={onInvestigate} />);
  expect(screen.getByText('Agent inventory unavailable')).toBeInTheDocument();
  expect(screen.queryByTestId('selectedAgentDossier')).not.toBeInTheDocument();
});
