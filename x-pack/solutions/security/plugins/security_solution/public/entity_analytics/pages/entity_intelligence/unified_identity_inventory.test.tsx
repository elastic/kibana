/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EntityType } from '../../../../common/entity_analytics/types';
import { UnifiedIdentityInventory } from './unified_identity_inventory';

const mockEntities = jest.fn();
const mockAgents = jest.fn();
const mockCodex = jest.fn();
const mockCursor = jest.fn();
const mockClaudeDesktop = jest.fn();
const mockGoogleAdk = jest.fn();
const refreshEntities = jest.fn();
const refreshAgents = jest.fn();
const refreshCodex = jest.fn();
const refreshCursor = jest.fn();
const refreshClaudeDesktop = jest.fn();
const refreshGoogleAdk = jest.fn();
const onEntity = jest.fn();
const onAgent = jest.fn();
const onCodex = jest.fn();
const onCursor = jest.fn();

jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test-space' }));
jest.mock('./hooks/use_intelligence_entity_list', () => ({
  useIntelligenceEntityList: () => mockEntities(),
}));
jest.mock('./ai_agents/use_agent_inventory', () => ({ useAgentInventory: () => mockAgents() }));
jest.mock('./ai_agents/use_codex_sessions', () => ({
  useCodexSessions: (_spaceId: string, provider?: string) => {
    if (provider === 'cursor') return mockCursor();
    if (provider === 'claude_desktop') return mockClaudeDesktop();
    if (provider === 'google_adk') return mockGoogleAdk();
    return mockCodex();
  },
}));
jest.mock('./ai_agents/provider_icon', () => ({ ProviderIcon: () => <span /> }));

const entities = ['user', 'host', 'service'].map((type) => ({
  id: `${type}:shared`,
  name: `${type}-identity`,
  type: type === 'user' ? EntityType.user : type === 'host' ? EntityType.host : EntityType.service,
  identifierValue: `${type}-identity`,
  riskScoreNorm: 77,
  riskLevel: 'High',
  source: 'endpoint',
  lastSeen: '2026-10-12T14:00:00Z',
}));
const agents = [
  {
    id: 'analyst',
    entityId: 'ai_agent:test-space:analyst',
    name: 'Investigation agent',
    activity: { invocations: 7, failedInvocations: 1, lastSeen: '2026-10-12T14:00:00Z' },
    owner: { name: 'creator' },
  },
];
const sessions = [
  {
    id: 'session-one',
    agentId: 'codex:install-one',
    lastSeen: '2026-10-12T15:00:00Z',
    owner: { id: 'local-owner', name: 'James', provenance: 'local_os_account' },
  },
];

const renderInventory = () =>
  render(
    <I18nProvider>
      <UnifiedIdentityInventory
        onInvestigateEntity={onEntity}
        onInvestigateAgent={onAgent}
        onInvestigateCodex={onCodex}
        onInvestigateCursor={onCursor}
      />
    </I18nProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockEntities.mockReturnValue({
    entities,
    total: 3,
    isError: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshEntities,
  });
  mockAgents.mockReturnValue({
    agents,
    status: 'available',
    definitionsStatus: 'available',
    activityStatus: 'available',
    isLoading: false,
    isRefreshing: false,
    refetch: refreshAgents,
  });
  mockCursor.mockReturnValue({
    sessions: [],
    total: 0,
    partial: false,
    unavailable: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshCursor,
  });
  mockClaudeDesktop.mockReturnValue({
    sessions: [],
    total: 0,
    partial: false,
    unavailable: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshClaudeDesktop,
  });
  mockGoogleAdk.mockReturnValue({
    sessions: [],
    total: 0,
    partial: false,
    unavailable: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshGoogleAdk,
  });
  mockCodex.mockReturnValue({
    sessions,
    total: 1,
    partial: false,
    unavailable: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshCodex,
  });
});

it('renders users, hosts, services, Agent Builder and Codex together with independent investigation links', () => {
  renderInventory();
  expect(screen.getAllByRole('table')).toHaveLength(1);
  for (const name of [
    'user-identity',
    'host-identity',
    'service-identity',
    'Investigation agent',
  ]) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: 'user-identity' }));
  expect(onEntity).toHaveBeenCalledWith(entities[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Investigation agent' }));
  expect(onAgent).toHaveBeenCalledWith('analyst');
  fireEvent.click(screen.getByRole('button', { name: 'Codex' }));
  expect(onCodex).toHaveBeenCalledWith('["codex:install-one","session-one"]');
  expect(screen.getByText('James')).toBeInTheDocument();
  expect(screen.getAllByText('Not scored')).toHaveLength(2);
});

it('searches and filters the combined inventory without mixing identity types', () => {
  renderInventory();
  fireEvent.click(screen.getByRole('button', { name: /AI agents/ }));
  expect(screen.queryByRole('button', { name: 'host-identity' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Codex' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search identities' }), {
    target: { value: 'install-one' },
  });
  expect(screen.queryByRole('button', { name: 'Investigation agent' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Codex' })).toBeInTheDocument();
});

it('retains agents when Entity Store fails and hides stale conventional rows', () => {
  mockEntities.mockReturnValue({
    entities,
    total: 3,
    isError: true,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshEntities,
  });
  renderInventory();
  expect(screen.getByText('Entity Store · Unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'user-identity' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Codex' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Investigation agent' })).toBeInTheDocument();
});

it('discloses bounded sources and does not show absent agent metrics as zero', () => {
  mockEntities.mockReturnValue({
    entities,
    total: 501,
    isError: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshEntities,
  });
  mockAgents.mockReturnValue({
    agents: [{ ...agents[0], activity: undefined }],
    status: 'partial',
    definitionsStatus: 'available',
    activityStatus: 'unavailable',
    isLoading: false,
    isRefreshing: false,
    refetch: refreshAgents,
  });
  mockCodex.mockReturnValue({
    sessions,
    total: 300,
    partial: false,
    unavailable: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshCodex,
  });
  renderInventory();
  expect(screen.getByText('1+ sessions')).toBeInTheDocument();
  expect(screen.getByText(/Filters apply to loaded identities/)).toBeInTheDocument();
  const agentRow = screen.getByRole('button', { name: 'Investigation agent' }).closest('tr');
  expect(agentRow).not.toBeNull();
  if (agentRow) expect(within(agentRow).queryByText('0 invocations')).not.toBeInTheDocument();
});

it('refreshes all six underlying sources independently from one inventory action', () => {
  renderInventory();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh inventory' }));
  expect(refreshEntities).toHaveBeenCalledTimes(1);
  expect(refreshAgents).toHaveBeenCalledTimes(1);
  expect(refreshCodex).toHaveBeenCalledTimes(1);
  expect(refreshCursor).toHaveBeenCalledTimes(1);
  expect(refreshClaudeDesktop).toHaveBeenCalledTimes(1);
  expect(refreshGoogleAdk).toHaveBeenCalledTimes(1);
});

it('hides unavailable cached agent and Codex rows without removing available conventional identities', () => {
  mockAgents.mockReturnValue({
    agents,
    status: 'unavailable',
    definitionsStatus: 'unavailable',
    activityStatus: 'available',
    isLoading: false,
    isRefreshing: false,
    refetch: refreshAgents,
  });
  mockCodex.mockReturnValue({
    sessions,
    total: 1,
    unavailable: true,
    partial: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshCodex,
  });
  renderInventory();
  expect(screen.queryByRole('button', { name: 'Codex' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Investigation agent' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'user-identity' })).toBeInTheDocument();
  expect(screen.getByText('Agent Builder · Unavailable')).toBeInTheDocument();
  expect(screen.getByText('Codex · Unavailable')).toBeInTheDocument();
});

it('hides cached invocation counts when activity becomes unavailable but retains the agent identity', () => {
  mockAgents.mockReturnValue({
    agents,
    status: 'partial',
    definitionsStatus: 'available',
    activityStatus: 'unavailable',
    isLoading: false,
    isRefreshing: false,
    refetch: refreshAgents,
  });
  renderInventory();
  expect(screen.getByRole('button', { name: 'Investigation agent' })).toBeInTheDocument();
  expect(screen.queryByText('7 invocations')).not.toBeInTheDocument();
});

it('opens Cursor independently and hides its cached rows when access becomes unavailable', () => {
  const cursor = {
    ...sessions[0],
    id: 'cursor-session',
    agentId: 'cursor-install',
    provider: 'cursor',
  };
  mockCursor.mockReturnValue({
    sessions: [cursor],
    total: 1,
    partial: false,
    unavailable: false,
    isLoading: false,
    isRefreshing: false,
    refetch: refreshCursor,
  });
  const view = renderInventory();
  fireEvent.click(screen.getByRole('button', { name: 'Cursor' }));
  expect(onCursor).toHaveBeenCalledWith('["cursor-install","cursor-session"]');
  expect(screen.getAllByText('Not scored')).toHaveLength(3);
  mockCursor.mockReturnValue({
    sessions: [cursor],
    unavailable: true,
    partial: false,
    total: 1,
    refetch: refreshCursor,
  });
  view.rerender(
    <I18nProvider>
      <UnifiedIdentityInventory
        onInvestigateEntity={onEntity}
        onInvestigateAgent={onAgent}
        onInvestigateCodex={onCodex}
        onInvestigateCursor={onCursor}
      />
    </I18nProvider>
  );
  expect(screen.queryByRole('button', { name: 'Cursor' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Codex' })).toBeInTheDocument();
});
