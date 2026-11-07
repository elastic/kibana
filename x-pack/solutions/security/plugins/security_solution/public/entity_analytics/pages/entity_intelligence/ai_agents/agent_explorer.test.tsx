/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentExplorer } from './agent_explorer';
import { useAgentInventory } from './use_agent_inventory';
import type { AgentInventoryItem, AgentInventoryResult } from './types';

jest.mock('./use_agent_inventory');
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'marketing' }));
jest.mock('./agent_dossier', () => ({
  AgentDossier: ({
    agent,
    initialInvocationId,
  }: {
    agent: AgentInventoryItem;
    initialInvocationId?: string;
  }) => {
    const [selection] = useState(initialInvocationId);
    return (
      <div data-test-subj="explorerAgentDossier">
        {agent.id} {selection}
      </div>
    );
  },
}));

const agent: AgentInventoryItem = {
  id: 'available-agent',
  entityId: 'ai_agent:marketing:available-agent',
  name: 'Available agent',
  description: '',
  type: 'chat',
  readonly: false,
  configuredTools: [],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: ['available-agent'],
};
const inventory: AgentInventoryResult = {
  agents: [agent],
  status: 'available',
  definitionsStatus: 'available',
  toolsStatus: 'available',
  activityStatus: 'available',
  isLoading: false,
  isRefreshing: false,
  refetch: jest.fn(),
  lookbackDays: 30,
};
const mockInventory = jest.mocked(useAgentInventory);

beforeEach(() => {
  jest.clearAllMocks();
  mockInventory.mockReturnValue(inventory);
});

it('reports an explicitly selected missing agent without silently showing another agent', () => {
  const onSelect = jest.fn();
  const { rerender } = render(<AgentExplorer agentId="removed-agent" onSelect={onSelect} />);
  expect(screen.getByText('The selected agent is unavailable in this space')).toBeInTheDocument();
  expect(screen.queryByTestId('explorerAgentDossier')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select an available agent' }));
  expect(onSelect).toHaveBeenCalledWith('available-agent');
  rerender(<AgentExplorer agentId="available-agent" onSelect={onSelect} />);
  expect(screen.getByTestId('explorerAgentDossier')).toHaveTextContent('available-agent');
});

it('does not offer a reset to an unavailable agent when the inventory is empty', () => {
  mockInventory.mockReturnValue({
    ...inventory,
    agents: [],
    status: 'empty',
    definitionsStatus: 'empty',
  });
  render(<AgentExplorer agentId="removed-agent" onSelect={jest.fn()} />);
  expect(screen.getByText('The selected agent is unavailable in this space')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Select an available agent' })
  ).not.toBeInTheDocument();
  expect(screen.queryByTestId('explorerAgentDossier')).not.toBeInTheDocument();
});

it('initializes the dossier with each explicitly selected finding invocation', () => {
  const onSelect = jest.fn();
  const { rerender } = render(
    <AgentExplorer agentId={agent.id} invocationId="trace:older-span" onSelect={onSelect} />
  );
  expect(screen.getByTestId('explorerAgentDossier')).toHaveTextContent('trace:older-span');
  rerender(<AgentExplorer agentId={agent.id} invocationId="trace:new-span" onSelect={onSelect} />);
  expect(screen.getByTestId('explorerAgentDossier')).toHaveTextContent('trace:new-span');
  expect(screen.getByTestId('explorerAgentDossier')).not.toHaveTextContent('trace:older-span');
});
