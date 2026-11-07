/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSecurityFindings } from '../security_findings/use_security_findings';
import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import { SecurityGraphNodes } from './security_graph_nodes';
import { SecurityFindingsPanel } from '../security_findings/security_findings_panel';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodexIntelligence } from './codex_intelligence';
import { useCodexSessions, useCodexSessionTools } from './use_codex_sessions';
import type { CodexSession } from './codex_types';
import { useGoogleRequesterEntity } from '../hooks/use_google_requester_entity';
import { EntityType } from '../../../../../common/entity_analytics/types';

jest.mock('../hooks/use_google_requester_entity');

jest.mock('../security_findings/use_security_findings');
jest.mock('./security_graph_nodes', () => ({
  SecurityGraphNodes: jest.fn(() => <div data-test-subj="securityGraphNodes" />),
  SecurityGraphSummary: () => null,
  SessionSecurityRemainder: () => null,
}));
jest.mock('../security_findings/security_findings_panel', () => ({
  SecurityFindingsPanel: jest.fn(() => null),
}));
jest.mock('./use_codex_sessions');
jest.mock('./codex_prompt_details', () => ({
  CodexPromptDetails: () => <div>{'Native prompt evidence'}</div>,
}));
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test-space' }));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
jest.mock('./codex_evidence', () => ({
  CodexEvidence: ({ session }: { session: CodexSession }) => (
    <div>
      {'Evidence for '}
      {session.id}
    </div>
  ),
}));

const session: CodexSession = {
  id: 'session-exact-id',
  agentId: 'install-a',
  start: '2026-10-12T10:00:00Z',
  lastSeen: '2026-10-12T10:10:00Z',
  toolCount: 2,
  failures: 0,
  successes: 1,
  unknowns: 1,
  completedTurns: 0,
  abortedTurns: 0,
  summaryComplete: true,
  tools: [{ name: 'shell', count: 2, failure_count: 0, success_count: 1, unknown_count: 1 }],
  source: { index: 'codex-test-space', id: 'session-document' },
  fileHash: 'hashed',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useGoogleRequesterEntity).mockReturnValue({
    entity: undefined,
    isLoading: false,
    unavailable: false,
    refetch: jest.fn(),
  });
  jest.mocked(useSecurityFindings).mockReturnValue({
    findings: [],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: true,
    refetch: jest.fn(),
  });
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [session],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 1,
    refetch: jest.fn(),
  });
  jest.mocked(useCodexSessionTools).mockReturnValue({
    events: [],
    isLoading: false,
    unavailable: false,
    complete: false,
    refetch: jest.fn(),
  });
});

it('opens the verified requester record returned by Entity Store', () => {
  const entity = {
    id: 'user:actual-canonical-id',
    name: 'Verified person',
    identifierValue: 'person@example.com',
    type: EntityType.user,
    riskLevel: 'Moderate' as const,
    riskScoreNorm: 57,
    criticality: undefined,
    source: undefined,
    lastSeen: undefined,
  };
  jest.mocked(useGoogleRequesterEntity).mockReturnValue({
    entity,
    isLoading: false,
    unavailable: false,
    refetch: jest.fn(),
  });
  const investigate = jest.fn();
  render(
    <CodexIntelligence
      provider="google_adk"
      view="explorer"
      onSelectSession={jest.fn()}
      onInvestigateEntity={investigate}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open requester identity' }));
  expect(investigate).toHaveBeenCalledWith(entity);
});

it('does not silently replace a missing explicit session with the first session', () => {
  const select = jest.fn();
  render(<CodexIntelligence view="explorer" sessionId="missing" onSelectSession={select} />);
  expect(
    screen.getByText('This activity group is not in the available 30-day inventory')
  ).toBeInTheDocument();
  expect(screen.queryByTestId('agentBehaviorPanel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open the latest available activity' }));
  expect(select).toHaveBeenCalledWith(JSON.stringify([session.agentId, session.id]));
});

it('hides cached session metadata when authorization fails', () => {
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [session],
    isLoading: false,
    isRefreshing: false,
    unavailable: true,
    partial: false,
    total: undefined,
    refetch: jest.fn(),
  });
  render(<CodexIntelligence view="inventory" onSelectSession={jest.fn()} />);
  expect(screen.getByText('Codex telemetry is unavailable')).toBeInTheDocument();
  expect(screen.queryByText(/Session session/)).not.toBeInTheDocument();
});

it('exposes insufficient baselines and opens source evidence for the exact selected session', () => {
  render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(screen.getByText('More evidence needed for comparison.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Identity & access' }));
  expect(screen.getByText('Not established by this source')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Source evidence' }));
  expect(screen.getByText('Evidence for session-exact-id')).toBeInTheDocument();
});

it('selects the exact installation and rejects ambiguous legacy session links', () => {
  const second: CodexSession = { ...session, agentId: 'install-b', model: 'distinct-model' };
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [session, second],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 2,
    refetch: jest.fn(),
  });
  const { rerender } = render(
    <CodexIntelligence
      view="explorer"
      sessionId={JSON.stringify(['install-b', session.id])}
      onSelectSession={jest.fn()}
    />
  );
  expect(jest.mocked(useCodexSessionTools)).toHaveBeenLastCalledWith('test-space', second, []);
  rerender(
    <CodexIntelligence view="explorer" sessionId={session.id} onSelectSession={jest.fn()} />
  );
  expect(
    screen.getByText('This activity group is not in the available 30-day inventory')
  ).toBeInTheDocument();
  expect(jest.mocked(useCodexSessionTools)).toHaveBeenLastCalledWith('test-space', undefined, []);
});

it('hides already-open tool evidence after the interaction query loses access', () => {
  const event = {
    id: 'event-a',
    agentId: session.agentId,
    sessionId: session.id,
    timestamp: session.start,
    toolName: 'shell',
    outcome: 'unknown' as const,
    source: { index: 'codex-test-space', id: 'tool-document' },
  };
  jest.mocked(useCodexSessionTools).mockReturnValue({
    events: [event],
    isLoading: false,
    unavailable: false,
    complete: false,
    refetch: jest.fn(),
  });
  const { rerender } = render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
  fireEvent.click(screen.getByRole('button', { name: 'shell' }));
  expect(screen.getByText('Evidence for session-exact-id')).toBeInTheDocument();
  jest.mocked(useCodexSessionTools).mockReturnValue({
    events: [],
    isLoading: false,
    unavailable: true,
    complete: false,
    refetch: jest.fn(),
  });
  rerender(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(screen.queryByText('Evidence for session-exact-id')).not.toBeInTheDocument();
});

it('does not present a zero finding count while fresh tool evidence is loading', () => {
  jest.mocked(useCodexSessionTools).mockReturnValue({
    events: [],
    isLoading: true,
    unavailable: false,
    complete: false,
    refetch: jest.fn(),
  });
  render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(screen.getByText('Loading tool evidence')).toBeInTheDocument();
  expect(screen.queryByTestId('agentBehaviorPanel')).not.toBeInTheDocument();
  expect(screen.queryByText('0 findings')).not.toBeInTheDocument();
});

it('opens tool activity directly from the session map', () => {
  const event = {
    id: 'event-a',
    agentId: session.agentId,
    sessionId: session.id,
    timestamp: session.start,
    toolName: 'shell',
    outcome: 'unknown' as const,
    source: { index: 'codex-test-space', id: 'tool-document' },
  };
  jest.mocked(useCodexSessionTools).mockReturnValue({
    events: [
      event,
      {
        ...event,
        id: 'event-b',
        toolName: 'search',
        source: { ...event.source, id: 'other-document' },
      },
    ],
    isLoading: false,
    unavailable: false,
    complete: true,
    refetch: jest.fn(),
  });
  render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter tool shell' }));
  expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByLabelText('Filter by tool')).toHaveValue('shell');
  expect(screen.getByRole('button', { name: 'shell' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'search' })).not.toBeInTheDocument();
});

it('shows recorded local ownership and session creator with separate provenance', () => {
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [
      {
        ...session,
        owner: { id: 'owner-a', name: 'james', provenance: 'local_os_account' },
        creator: {
          id: 'recorded-user',
          accountId: 'recorded-account',
          provenance: 'codex_session_creator',
        },
      },
    ],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 1,
    refetch: jest.fn(),
  });
  render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Identity & access' }));
  expect(screen.getByText('Local account owner')).toBeInTheDocument();
  expect(screen.getByText('Source file ownership')).toBeInTheDocument();
  expect(screen.getByText('Session creator')).toBeInTheDocument();
  expect(screen.getByText('recorded-user')).toBeInTheDocument();
  expect(screen.getByText('recorded-account')).toBeInTheDocument();
});

it('labels mixed models and explains withheld historical comparisons without presenting the last model as the whole session', () => {
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [{ ...session, model: 'last-model', models: ['first-model', 'last-model'] }],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 1,
    refetch: jest.fn(),
  });
  render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(screen.getByText('Multiple models')).toBeInTheDocument();
  expect(
    screen.getByText('Multiple models recorded; historical comparisons are withheld.')
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Identity & access' }));
  expect(screen.getByText('first-model, last-model')).toBeInTheDocument();
});

it('shares exact Cursor session evidence with the map and other detail views', () => {
  render(<CodexIntelligence provider="cursor" view="explorer" onSelectSession={jest.fn()} />);
  const scope = {
    type: 'agent',
    provider: 'cursor',
    agentId: session.agentId,
    sessionId: session.id,
  };
  expect(useSecurityFindings).toHaveBeenLastCalledWith(scope, 'test-space');
  expect(SecurityFindingsPanel).not.toHaveBeenCalled();
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({
      scope,
      result: jest.mocked(useSecurityFindings).mock.results[0].value,
    })
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
  expect(SecurityFindingsPanel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Prompts' }));
  expect(SecurityFindingsPanel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Identity & access' }));
  expect(jest.mocked(SecurityFindingsPanel).mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({
      scope,
      result: jest.mocked(useSecurityFindings).mock.results[0].value,
    })
  );
});

it('disables security queries for an unavailable explicit session', () => {
  render(<CodexIntelligence view="explorer" sessionId="missing" onSelectSession={jest.fn()} />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    { type: 'agent', provider: 'codex', agentId: '', sessionId: '' },
    undefined
  );
  expect(SecurityFindingsPanel).not.toHaveBeenCalled();
  expect(SecurityGraphNodes).not.toHaveBeenCalled();
});

it('changes the security scope when selecting an exact child session in the relationship map', () => {
  const child: CodexSession = {
    ...session,
    id: 'child-session',
    parentId: session.id,
    title: 'Child work',
  };
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [session, child],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 2,
    refetch: jest.fn(),
  });
  const selectSession = jest.fn();
  const { rerender } = render(
    <CodexIntelligence view="explorer" sessionId={session.id} onSelectSession={selectSession} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open session Child work' }));
  expect(selectSession).toHaveBeenCalledWith(JSON.stringify([child.agentId, child.id]));
  rerender(
    <CodexIntelligence
      view="explorer"
      sessionId={JSON.stringify([child.agentId, child.id])}
      onSelectSession={selectSession}
    />
  );
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    { type: 'agent', provider: 'codex', agentId: child.agentId, sessionId: child.id },
    'test-space'
  );
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].scope).toEqual({
    type: 'agent',
    provider: 'codex',
    agentId: child.agentId,
    sessionId: child.id,
  });
});

it('keeps security evidence stable during inventory refresh and forwards real security refreshes', () => {
  const evidence: SecurityFindingsResult = {
    findings: [],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: true,
    refetch: jest.fn(),
  };
  jest.mocked(useSecurityFindings).mockReturnValue(evidence);
  const { rerender } = render(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].result).toEqual(evidence);
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [session],
    isLoading: false,
    isRefreshing: true,
    unavailable: false,
    partial: false,
    total: 1,
    refetch: jest.fn(),
  });
  rerender(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    { type: 'agent', provider: 'codex', agentId: session.agentId, sessionId: session.id },
    'test-space'
  );
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].result).toEqual(evidence);
  const refreshingEvidence = { ...evidence, isRefreshing: true };
  jest.mocked(useSecurityFindings).mockReturnValue(refreshingEvidence);
  rerender(<CodexIntelligence view="explorer" onSelectSession={jest.fn()} />);
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].result).toEqual(refreshingEvidence);
});

it('requests native input evidence only for findings on the exact provider, installation and session', () => {
  const invocation: NonNullable<SecurityFinding['invocation']> = {
    correlation: 'exact_native_observation',
    toolCallId: 'native-call',
    toolName: 'read_file',
    source: { index: 'logs-cursor.entity_intelligence-test-space', id: 'exact-native-source' },
    input: 'protected-customer-data.csv',
    inputSource: 'bubble.toolFormerData.params',
    inputRecordHash: 'record-hash',
    inputRedacted: false,
    inputTruncated: false,
  };
  const nativeFinding: SecurityFinding = {
    id: 'policy-finding',
    timestamp: session.start,
    title: 'AI policy match',
    severity: 'high',
    status: 'open',
    kind: 'detection',
    outcome: 'unknown',
    rule: { name: 'AI policy match' },
    source: { index: 'alerts', id: 'policy-finding' },
    ancestors: [],
    entityIds: [],
    agent: { provider: 'cursor', id: session.agentId, sessionId: session.id },
    invocation,
  };
  const scopeMismatches: SecurityFinding[] = [
    { ...nativeFinding, agent: { provider: 'codex', id: session.agentId, sessionId: session.id } },
    {
      ...nativeFinding,
      agent: { provider: 'cursor', id: 'other-installation', sessionId: session.id },
    },
    {
      ...nativeFinding,
      agent: { provider: 'cursor', id: session.agentId, sessionId: 'other-session' },
    },
    { ...nativeFinding, invocation: undefined },
    { ...nativeFinding, invocation: { ...invocation, correlation: 'exact_request_id' } },
  ];
  jest.mocked(useSecurityFindings).mockReturnValue({
    findings: [nativeFinding, ...scopeMismatches],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    refetch: jest.fn(),
  });
  render(<CodexIntelligence provider="cursor" view="explorer" onSelectSession={jest.fn()} />);
  expect(useCodexSessionTools).toHaveBeenLastCalledWith('test-space', session, [
    'exact-native-source',
  ]);
});

it('labels Claude Desktop activity as MCP connections and never exposes a fabricated chat transcript', () => {
  const connection: CodexSession = {
    ...session,
    provider: 'claude_desktop',
    title: 'MCP connection · connection-uuid',
    owner: { id: 'uid:501', name: 'james', provenance: 'local_os_account' },
  };
  jest.mocked(useCodexSessions).mockReturnValue({
    sessions: [connection],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 1,
    refetch: jest.fn(),
  });
  render(
    <CodexIntelligence view="explorer" provider="claude_desktop" onSelectSession={jest.fn()} />
  );
  expect(screen.getByRole('tab', { name: 'MCP connection map' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'MCP connections' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Prompts' })).not.toBeInTheDocument();
  expect(
    screen.getByText(/Chat IDs, prompts and the authenticated human requester are not observed/)
  ).toBeInTheDocument();
  expect(screen.queryByTestId('agentBehaviorPanel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Identity & access' }));
  expect(screen.getByText('MCP connection ID')).toBeInTheDocument();
});
