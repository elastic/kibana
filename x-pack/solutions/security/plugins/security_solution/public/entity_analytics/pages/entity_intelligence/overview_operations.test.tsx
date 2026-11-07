/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { OverviewFindings } from './overview_findings';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverviewOperations } from './overview_operations';
import { useCodexSessions } from './ai_agents/use_codex_sessions';
import { useAgentInventory } from './ai_agents/use_agent_inventory';
import type { CodexSession } from './ai_agents/codex_types';
import type { IntelligenceEntity } from './common';
import { EntityType } from '../../../../common/entity_analytics/types';

jest.mock('./overview_findings', () => ({
  OverviewFindings: jest.fn(() => null),
}));
jest.mock('./ai_agents/use_codex_sessions');
jest.mock('./ai_agents/use_agent_inventory');
jest.mock('./ai_agents/provider_icon', () => ({ ProviderIcon: () => <span /> }));
jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test-space' }));
jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
const session: CodexSession = {
  id: 'session-id',
  agentId: 'installation',
  provider: 'cursor',
  title: 'Investigate checkout failure',
  start: '2026-10-12T10:00:00Z',
  lastSeen: '2026-10-12T11:00:00Z',
  toolCount: 1,
  failures: 0,
  successes: 1,
  unknowns: 0,
  completedTurns: 1,
  abortedTurns: 0,
  summaryComplete: true,
  tools: [{ name: 'shell', count: 1, failure_count: 0, success_count: 1, unknown_count: 0 }],
  source: { index: 'logs-cursor.entity_intelligence-default', id: 'document' },
  fileHash: 'hash',
};
const externalResult = {
  sessions: [session],
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  partial: false,
  total: 1,
  refetch: jest.fn(),
};
const renderOverview = (onCursor = jest.fn()) =>
  render(
    <OverviewOperations
      entities={[]}
      entitiesLoading={false}
      entitiesUnavailable={false}
      onInvestigateEntity={jest.fn()}
      onViewAllEntities={jest.fn()}
      onInvestigateCursor={onCursor}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useCodexSessions)
    .mockImplementation((_space, provider) =>
      provider === 'cursor' ? externalResult : { ...externalResult, sessions: [], total: 0 }
    );
  jest.mocked(useAgentInventory).mockReturnValue({
    agents: [],
    isLoading: false,
    isRefreshing: false,
    status: 'empty',
    definitionsStatus: 'empty',
    toolsStatus: 'empty',
    activityStatus: 'empty',
    lookbackDays: 30,
    refetch: jest.fn(),
  });
});

it('keeps source activity visible and opens Cursor without routing to Codex', () => {
  const onCursor = jest.fn();
  renderOverview(onCursor);
  fireEvent.click(screen.getByRole('button', { name: 'Explore Cursor' }));
  expect(onCursor).toHaveBeenCalledWith(JSON.stringify([session.agentId, session.id]));
  expect(screen.getByText('Investigate checkout failure')).toBeInTheDocument();
});

it('hides cached content and disables drill-in when the source becomes unavailable', () => {
  jest.mocked(useCodexSessions).mockReturnValue({ ...externalResult, unavailable: true });
  renderOverview();
  expect(screen.queryByText('Investigate checkout failure')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Explore Cursor' })).toBeDisabled();
  expect(screen.getByText('Waiting for comparable history')).toBeInTheDocument();
});

it('does not report all-clear when no session has an eligible comparison baseline', () => {
  renderOverview();
  expect(
    screen.getByText(
      'No items in the available evidence. Some sources or comparison baselines are incomplete.'
    )
  ).toBeInTheDocument();
  expect(
    screen.queryByText('No high-risk entities or detected session changes in this snapshot.')
  ).not.toBeInTheDocument();
});

it('opens a security finding using its exact provider, installation and session', () => {
  const codex = jest.fn();
  const cursor = jest.fn();
  const builder = jest.fn();
  render(
    <OverviewOperations
      entities={[]}
      entitiesLoading={false}
      entitiesUnavailable={false}
      onInvestigateEntity={jest.fn()}
      onViewAllEntities={jest.fn()}
      onInvestigateCodex={codex}
      onInvestigateCursor={cursor}
      onInvestigateAgent={builder}
    />
  );
  const props = jest.mocked(OverviewFindings).mock.calls.at(-1)?.[0];
  expect(props?.scope).toEqual({ type: 'all' });
  props?.onInvestigateAgent?.({
    provider: 'cursor',
    id: 'cursor-install',
    sessionId: 'cursor-session',
  });
  expect(cursor).toHaveBeenCalledWith(JSON.stringify(['cursor-install', 'cursor-session']));
  expect(codex).not.toHaveBeenCalled();
  props?.onInvestigateAgent?.({
    provider: 'codex',
    id: 'codex-install',
    sessionId: 'codex-session',
  });
  expect(codex).toHaveBeenCalledWith(JSON.stringify(['codex-install', 'codex-session']));
  props?.onInvestigateAgent?.({ provider: 'agent_builder', id: 'builder-agent' });
  expect(builder).toHaveBeenCalledWith('builder-agent');
});

it('investigates only an entity with the exact linked entity ID', () => {
  const entity: IntelligenceEntity = {
    id: 'user:recorded-id',
    name: 'James',
    identifierValue: 'James',
    type: EntityType.user,
    riskScoreNorm: undefined,
    riskLevel: 'Unknown',
    criticality: undefined,
    source: undefined,
    lastSeen: undefined,
  };
  const investigate = jest.fn();
  render(
    <OverviewOperations
      entities={[entity]}
      entitiesLoading={false}
      entitiesUnavailable={false}
      onInvestigateEntity={investigate}
      onViewAllEntities={jest.fn()}
    />
  );
  const props = jest.mocked(OverviewFindings).mock.calls.at(-1)?.[0];
  props?.onInvestigateEntity?.('James');
  expect(investigate).not.toHaveBeenCalled();
  props?.onInvestigateEntity?.(entity.id);
  expect(investigate).toHaveBeenCalledWith(entity);
});

it('shows the authenticated Google requester without presenting it as a local owner', () => {
  const googleSession: CodexSession = {
    ...session,
    provider: 'google_adk',
    title: 'Export after containment',
    googleAdk: {
      project_id: 'test-project',
      service_name: 'support-agent',
      revision: 'support-agent-001',
      run_id: 'run-1',
      trace_id: 'a'.repeat(32),
      span_id: 'b'.repeat(16),
      requester: {
        email: 'requester@example.com',
        subject: 'google-account-1',
        authenticated: true,
        provenance: 'google_signed_id_token_verified_by_application',
        human_identity: 'account_level_only',
      },
      runtime: {
        email: 'runtime@test-project.iam.gserviceaccount.com',
        provenance: 'cloud_run_metadata_service_identity',
      },
      resources: [],
      audit_matches: [],
      source_policy: {
        id: 'policy-1',
        name: 'Export policy',
        revision: 1,
        mode: 'monitor',
        enforced: false,
        matches: [],
      },
    },
  };
  jest.mocked(useCodexSessions).mockImplementation((_space, provider) => ({
    ...externalResult,
    sessions: provider === 'google_adk' ? [googleSession] : [],
    total: provider === 'google_adk' ? 1 : 0,
  }));
  renderOverview();
  expect(screen.getByText('Requester: requester@example.com')).toBeInTheDocument();
  expect(screen.queryByText('Local owner: requester@example.com')).not.toBeInTheDocument();
  expect(screen.queryByText('Owner not recorded')).not.toBeInTheDocument();
});
