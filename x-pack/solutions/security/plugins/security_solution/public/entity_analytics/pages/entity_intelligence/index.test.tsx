/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { EntityIntelligencePage } from '.';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { UnifiedIdentityInventoryProps } from './unified_identity_inventory';
import type { SecurityFindingsPanelProps } from './security_findings/security_findings_panel';

const mockConventionalEntity: IntelligenceEntity = {
  id: 'host:one',
  name: 'Host one',
  identifierValue: 'Host one',
  type: EntityType.host,
  riskScoreNorm: 75,
  riskLevel: 'High',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const mockEntityPrivileges = jest.fn();
const mockRiskPrivileges = jest.fn();
const mockEntityDataView = jest.fn();
const mockEntityStoreStatus = jest.fn();

jest.mock('../../../common/components/page_wrapper', () => ({
  SecuritySolutionPageWrapper: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
jest.mock('../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../common/components/page_loader', () => ({
  PageLoader: () => <div>{'Loading conventional entities'}</div>,
}));
jest.mock('../../../common/components/no_privileges', () => ({
  NoPrivileges: () => <div>{'Entity Store access denied'}</div>,
}));
jest.mock('../../../common/components/empty_prompt', () => ({
  EmptyPrompt: () => <div>{'No Entity Store data'}</div>,
}));
jest.mock('../entity_store_disabled_empty_prompt', () => ({
  EntityStoreDisabledEmptyPrompt: () => <div>{'Entity Store stopped'}</div>,
}));
jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test-space' }));
jest.mock('../../hooks/use_missing_risk_engine_privileges', () => ({
  useMissingRiskEnginePrivileges: () => mockRiskPrivileges(),
}));
jest.mock('../../components/entity_store/hooks/use_entity_engine_privileges', () => ({
  useEntityEnginePrivileges: () => mockEntityPrivileges(),
}));
jest.mock('../../components/home/use_entity_store_data_view', () => ({
  useEntityStoreDataView: () => mockEntityDataView(),
}));
jest.mock('../../components/entity_store/hooks/use_entity_store', () => ({
  useEntityStoreStatus: () => mockEntityStoreStatus(),
}));
jest.mock('./unified_identity_inventory', () => ({
  UnifiedIdentityInventory: ({
    onInvestigateEntity,
    onInvestigateAgent,
    onInvestigateCodex,
    onInvestigateCursor,
  }: UnifiedIdentityInventoryProps) => (
    <div>
      {'Unified identity inventory'}
      <button
        type="button"
        onClick={() => onInvestigateCursor('["cursor-install","cursor-session"]')}
      >
        {'Investigate mixed Cursor'}
      </button>
      <button type="button" onClick={() => onInvestigateEntity(mockConventionalEntity)}>
        {'Investigate mixed host'}
      </button>
      <button type="button" onClick={() => onInvestigateAgent('investigator')}>
        {'Investigate mixed agent'}
      </button>
      <button type="button" onClick={() => onInvestigateCodex('["install","session"]')}>
        {'Investigate mixed Codex'}
      </button>
    </div>
  ),
}));
jest.mock('./overview_tab', () => ({
  OverviewTab: ({
    onViewAllEntities,
    onInvestigateCursor,
  }: {
    onViewAllEntities: () => void;
    onInvestigateCursor?: (id: string) => void;
  }) => (
    <div>
      {'Identity overview'}
      <button type="button" onClick={onViewAllEntities}>
        {'View all identities'}
      </button>
      <button
        type="button"
        onClick={() => onInvestigateCursor?.('["cursor-install","cursor-session"]')}
      >
        {'Overview Cursor'}
      </button>
    </div>
  ),
}));
jest.mock('./entities/ui/entities_tab', () => ({
  EntitiesTab: () => <div>{'Conventional inventory'}</div>,
}));
jest.mock('./explorer_tab', () => ({
  ExplorerTab: ({
    initialEntity,
    entityId,
  }: {
    initialEntity?: IntelligenceEntity;
    entityId?: string;
  }) => (
    <div>
      {'Conventional explorer'}
      {initialEntity && <span>{initialEntity.name}</span>}
      {entityId && <span data-test-subj="requestedEntityId">{entityId}</span>}
    </div>
  ),
}));
jest.mock('./ai_policies/ai_policies_tab', () => ({
  AiPoliciesTab: ({
    onInvestigateAgent,
  }: Pick<SecurityFindingsPanelProps, 'onInvestigateAgent'>) => (
    <button
      type="button"
      onClick={() =>
        onInvestigateAgent?.({
          provider: 'agent_builder',
          id: 'investigator',
          sessionId: 'recorded-trace:recorded-span',
        })
      }
    >
      {'Investigate policy finding'}
    </button>
  ),
}));
jest.mock('./ai_hunt_tab', () => ({ AiHuntTab: () => <div>{'AI Hunt content'}</div> }));
jest.mock('./use_cases_tab', () => ({ UseCasesTab: () => <div>{'Use Cases content'}</div> }));
jest.mock('./ai_agents/codex_intelligence', () => ({
  CodexIntelligence: ({
    sessionId,
    onSelectSession,
    provider,
  }: {
    sessionId?: string;
    provider?: 'codex' | 'cursor';
    onSelectSession: (id: string) => void;
  }) => (
    <div>
      {provider === 'cursor' ? 'Cursor session: ' : 'Codex session: '}
      {sessionId}
      <button type="button" onClick={() => onSelectSession('recorded-session')}>
        {'Open recorded session'}
      </button>
    </div>
  ),
}));
jest.mock('./ai_agents/agent_inventory', () => ({
  AgentInventory: () => <div>{'Agent inventory content'}</div>,
}));
jest.mock('./ai_agents/agent_explorer', () => ({
  AgentExplorer: ({ agentId, invocationId }: { agentId?: string; invocationId?: string }) => (
    <div>
      {'Agent explorer: '}
      {agentId}
      {invocationId && <span data-test-subj="selectedAgentInvocation">{invocationId}</span>}
    </div>
  ),
}));

const renderPage = (search: string) => {
  const history = createMemoryHistory({ initialEntries: [`/entity_intelligence${search}`] });
  render(
    <I18nProvider>
      <Router history={history}>
        <EntityIntelligencePage />
      </Router>
    </I18nProvider>
  );
  return history;
};

describe('Entity Intelligence scoped prerequisites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntityPrivileges.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { has_read_permissions: true },
    });
    mockRiskPrivileges.mockReturnValue({ isLoading: false });
    mockEntityDataView.mockReturnValue({
      isLoading: false,
      dataView: { matchedIndices: ['entities'] },
    });
    mockEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  });

  it('opens agent inventory without calling Entity Store prerequisite APIs', () => {
    mockEntityPrivileges.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { has_read_permissions: false },
    });
    mockEntityDataView.mockReturnValue({ isLoading: true });
    renderPage('?tab=entities&scope=agents');
    expect(screen.getByText('Agent inventory content')).toBeInTheDocument();
    expect(mockEntityPrivileges).not.toHaveBeenCalled();
    expect(mockRiskPrivileges).not.toHaveBeenCalled();
    expect(mockEntityDataView).not.toHaveBeenCalled();
    expect(mockEntityStoreStatus).not.toHaveBeenCalled();
  });

  it('opens an explicitly selected agent in Explorer with Entity Store absent', () => {
    mockEntityDataView.mockReturnValue({ isLoading: false, dataView: undefined });
    mockEntityStoreStatus.mockReturnValue({ data: { status: 'not_installed' } });
    renderPage('?tab=explorer&scope=agents&agentId=investigator');
    expect(screen.getByText('Agent explorer: investigator')).toBeInTheDocument();
    expect(mockEntityDataView).not.toHaveBeenCalled();
  });

  it('preserves the exact Agent Builder invocation when investigating a policy finding', () => {
    const history = renderPage('?tab=ai_policies&scope=all');
    fireEvent.click(screen.getByRole('button', { name: 'Investigate policy finding' }));
    const params = new URLSearchParams(history.location.search);
    expect(params.get('tab')).toBe('explorer');
    expect(params.get('scope')).toBe('agents');
    expect(params.get('agentSource')).toBe('agent_builder');
    expect(params.get('agentId')).toBe('investigator');
    expect(params.get('sessionId')).toBe('recorded-trace:recorded-span');
    expect(screen.getByTestId('selectedAgentInvocation')).toHaveTextContent(
      'recorded-trace:recorded-span'
    );
    expect(mockEntityPrivileges).not.toHaveBeenCalled();
  });

  it('keeps navigation and scope switching available while conventional prerequisites load', () => {
    mockEntityPrivileges.mockReturnValue({ isLoading: true });
    renderPage('?tab=entities&scope=entities');
    expect(screen.getByRole('heading', { name: 'Entity Intelligence' })).toBeInTheDocument();
    expect(screen.getByText('Loading conventional entities')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Entities' }));
    fireEvent.click(screen.getByText('AI agents'));
    expect(screen.getByText('Agent inventory content')).toBeInTheDocument();
    expect(screen.queryByText('Loading conventional entities')).not.toBeInTheDocument();
  });

  it('enforces conventional privileges when switching back from agents', () => {
    mockEntityPrivileges.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { has_read_permissions: false },
    });
    renderPage('?tab=entities&scope=agents');
    fireEvent.click(screen.getByText('Users, hosts & services'));
    expect(screen.getByText('Entity Store access denied')).toBeInTheDocument();
    expect(screen.queryByText('Conventional inventory')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('AI agents'));
    expect(screen.getByText('Agent inventory content')).toBeInTheDocument();
  });

  it('preserves scoped missing-data and stopped-store states', () => {
    mockEntityDataView.mockReturnValue({ isLoading: false, dataView: undefined });
    const history = renderPage('?tab=entities&scope=entities');
    expect(screen.getByText('No Entity Store data')).toBeInTheDocument();
    fireEvent.click(screen.getByText('AI agents'));
    expect(history.location.search).toContain('scope=agents');
    expect(screen.getByText('Agent inventory content')).toBeInTheDocument();
  });

  it('keeps a stopped Entity Store gate confined to conventional content', () => {
    mockEntityStoreStatus.mockReturnValue({ data: { status: 'stopped' } });
    renderPage('?tab=explorer&scope=entities');
    expect(screen.getByText('Entity Store stopped')).toBeInTheDocument();
    expect(screen.queryByText('Conventional explorer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('AI agents'));
    expect(screen.getByText('Agent explorer:')).toBeInTheDocument();
  });
});

it('opens Codex independently of Agent Builder and Entity Store and persists a selected session', () => {
  jest.clearAllMocks();
  const history = renderPage('?tab=entities&scope=agents&agentSource=codex');
  expect(screen.getByText('Codex session:')).toBeInTheDocument();
  expect(screen.queryByText('Agent inventory content')).not.toBeInTheDocument();
  expect(mockEntityDataView).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open recorded session' }));
  expect(history.location.search).toContain('tab=explorer');
  expect(history.location.search).toContain('sessionId=recorded-session');
  fireEvent.click(screen.getByRole('tab', { name: 'Elastic Agent Builder' }));
  expect(history.location.search).not.toContain('sessionId');
  expect(screen.getByText('Agent explorer:')).toBeInTheDocument();
});

it('lands on a unified inventory even when Entity Store access is unavailable', () => {
  jest.clearAllMocks();
  mockEntityPrivileges.mockReturnValue({ isLoading: true });
  renderPage('');
  expect(screen.getByText('Unified identity inventory')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Entities' })).toHaveAttribute('aria-selected', 'true');
  expect(mockEntityPrivileges).not.toHaveBeenCalled();
  expect(mockEntityDataView).not.toHaveBeenCalled();
});

it('opens the correct Agent Builder investigation from All after previously selecting Codex', () => {
  const history = renderPage('?tab=entities&scope=all&agentSource=codex&sessionId=old');
  fireEvent.click(screen.getByRole('button', { name: 'Investigate mixed agent' }));
  expect(screen.getByText('Agent explorer: investigator')).toBeInTheDocument();
  expect(history.location.search).toContain('scope=agents');
  expect(history.location.search).toContain('agentSource=agent_builder');
  expect(history.location.search).not.toContain('sessionId');
});

it('opens the selected Codex installation and session from the unified inventory', () => {
  const history = renderPage('?tab=entities&scope=all');
  fireEvent.click(screen.getByRole('button', { name: 'Investigate mixed Codex' }));
  expect(new URLSearchParams(history.location.search).get('sessionId')).toBe(
    '["install","session"]'
  );
  expect(history.location.search).toContain('agentSource=codex');
  expect(screen.getByText('Codex session: ["install","session"]')).toBeInTheDocument();
});

it('hands the selected conventional identity to Explorer from All', () => {
  mockEntityPrivileges.mockReturnValue({
    isLoading: false,
    isError: false,
    data: { has_read_permissions: true },
  });
  mockEntityDataView.mockReturnValue({
    isLoading: false,
    dataView: { matchedIndices: ['entities'] },
  });
  mockEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  const history = renderPage('?tab=entities&scope=all');
  fireEvent.click(screen.getByRole('button', { name: 'Investigate mixed host' }));
  expect(screen.getByText('Host one')).toBeInTheDocument();
  expect(history.location.search).toContain('tab=explorer');
  expect(history.location.search).toContain('scope=entities');
  expect(new URLSearchParams(history.location.search).get('entityId')).toBe('host:one');
});

it('preserves the exact canonical identity in a direct Explorer link', () => {
  mockEntityPrivileges.mockReturnValue({
    isLoading: false,
    isError: false,
    data: { has_read_permissions: true },
  });
  mockEntityDataView.mockReturnValue({
    isLoading: false,
    dataView: { matchedIndices: ['entities'] },
  });
  mockEntityStoreStatus.mockReturnValue({ data: { status: 'running' } });
  renderPage('?tab=explorer&scope=entities&entityId=user%3Averified-subject%40unknown');
  expect(screen.getByTestId('requestedEntityId')).toHaveTextContent(
    'user:verified-subject@unknown'
  );
});

it('opens the selected Cursor session from the unified inventory without Entity Store prerequisites', () => {
  jest.clearAllMocks();
  const history = renderPage('?tab=entities&scope=all');
  fireEvent.click(screen.getByRole('button', { name: 'Investigate mixed Cursor' }));
  expect(history.location.search).toContain('agentSource=cursor');
  expect(
    screen.getByText('Cursor session: ["cursor-install","cursor-session"]')
  ).toBeInTheDocument();
  expect(mockEntityPrivileges).not.toHaveBeenCalled();
});

it('keeps overview accessible without conventional data and routes View all to unified identities', () => {
  jest.clearAllMocks();
  mockEntityPrivileges.mockReturnValue({ isLoading: true });
  const history = renderPage('?tab=overview&scope=entities');
  expect(screen.getByText('Identity overview')).toBeInTheDocument();
  expect(mockEntityPrivileges).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View all identities' }));
  expect(history.location.search).toContain('scope=all');
  expect(screen.getByText('Unified identity inventory')).toBeInTheDocument();
});

it('routes overview Cursor investigations to the matching provider session', () => {
  renderPage('?tab=overview');
  fireEvent.click(screen.getByRole('button', { name: 'Overview Cursor' }));
  expect(
    screen.getByText('Cursor session: ["cursor-install","cursor-session"]')
  ).toBeInTheDocument();
});
