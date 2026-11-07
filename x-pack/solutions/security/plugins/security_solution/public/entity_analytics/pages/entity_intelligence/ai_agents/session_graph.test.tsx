/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import { FindingDetails } from '../security_findings/security_findings_panel';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CodexSessionGraph } from './session_graph';
import type { CodexSession, CodexToolEvent } from './codex_types';

jest.mock('../security_findings/security_findings_panel', () => ({
  activityLabel: (action: string) => action,
  FindingDetails: jest.fn(
    ({ finding, onClose }: { finding: SecurityFinding; onClose: () => void }) => (
      <div role="dialog">
        <span>{finding.title}</span>
        <button type="button" onClick={onClose}>
          {'Close'}
        </button>
      </div>
    )
  ),
}));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

const session: CodexSession = {
  id: 'session-root',
  agentId: 'installation-a',
  nickname: 'Root session',
  model: 'gpt-6',
  start: '2026-10-12T12:00:00Z',
  lastSeen: '2026-10-12T13:00:00Z',
  owner: { id: 'local-owner-id', name: 'james', provenance: 'local_os_account' },
  toolCount: 5,
  failures: 1,
  successes: 3,
  unknowns: 1,
  completedTurns: 1,
  abortedTurns: 0,
  tools: [{ name: 'exec_command', count: 5, failure_count: 1, success_count: 3, unknown_count: 1 }],
  summaryComplete: true,
  source: { index: 'codex-test', id: 'root-source' },
  fileHash: 'hash',
};

it('selects exact session objects and filters only real selected-session tool summaries', () => {
  const child = {
    ...session,
    id: 'child',
    parentId: session.id,
    nickname: 'Erdos',
    role: 'subagent' as const,
    agentPath: '/root/agent_telemetry',
  };
  const otherInstallation = { ...child, agentId: 'installation-b', nickname: 'Other installation' };
  const onSelectSession = jest.fn();
  const onSelectTool = jest.fn();
  render(
    <CodexSessionGraph
      sessions={[session, child, otherInstallation]}
      selected={session}
      onSelectSession={onSelectSession}
      onSelectTool={onSelectTool}
    />
  );
  expect(screen.getByText('james')).toBeInTheDocument();
  expect(screen.getByText('agent_telemetry')).toBeInTheDocument();
  expect(screen.getByTestId('codexGraphOwnerLink')).toBeInTheDocument();
  expect(screen.getAllByTestId('codexGraphParentLink')).toHaveLength(1);
  expect(
    screen.queryByRole('button', { name: 'Open session Other installation' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open session Erdos' }));
  expect(onSelectSession).toHaveBeenCalledWith(child);
  fireEvent.click(screen.getByRole('button', { name: 'Filter tool exec_command' }));
  expect(onSelectTool).toHaveBeenCalledWith('exec_command');
  expect(screen.getByTestId('codexGraphSelectedSession')).toHaveAttribute('aria-current', 'true');
});

it('does not draw ownership when unrecorded and exposes partial summaries without inventing activity', () => {
  const partial = { ...session, owner: undefined, summaryComplete: false, tools: [] };
  render(
    <CodexSessionGraph
      sessions={[partial]}
      selected={partial}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
    />
  );
  expect(screen.getByText('Not recorded')).toBeInTheDocument();
  expect(screen.queryByTestId('codexGraphOwnerLink')).not.toBeInTheDocument();
  expect(screen.getByText('Partial snapshot')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Filter tool/ })).not.toBeInTheDocument();
});

it('hides reviews and unrelated sessions by default and expands them through separate controls', () => {
  const root = { ...session, nickname: undefined, role: 'user' as const };
  const review = {
    ...session,
    id: 'review',
    nickname: undefined,
    parentId: root.id,
    role: 'guardian_review' as const,
  };
  const other = { ...session, id: 'other', nickname: 'Other work' };
  render(
    <CodexSessionGraph
      sessions={[root, review, other]}
      selected={root}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
    />
  );
  expect(screen.getByRole('button', { name: 'Open session Main session' })).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Open session Review session' })
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open session Other work' })).not.toBeInTheDocument();
  expect(screen.getByText('Include review sessions (1)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('switch'));
  expect(screen.getByRole('button', { name: 'Open session Review session' })).toBeInTheDocument();
  expect(screen.getAllByTestId('codexGraphParentLink')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Other sessions (1)' }));
  expect(screen.getByRole('button', { name: 'Open session Other work' })).toBeInTheDocument();
  expect(
    screen.getByText('Other sessions · no recorded connection to this tree')
  ).toBeInTheDocument();
  expect(screen.getAllByTestId('codexGraphParentLink')).toHaveLength(1);
});

const toolEvent: CodexToolEvent = {
  id: 'native-call',
  agentId: session.agentId,
  sessionId: session.id,
  provider: 'codex',
  timestamp: session.start,
  toolName: 'exec_command',
  outcome: 'failure',
  observationType: 'native_tool_completion',
  recordHash: 'hash',
  turnId: 'native-turn',
  exitCode: 77,
  source: { index: 'native-index', id: 'native-id' },
};
const finding: SecurityFinding = {
  id: 'finding',
  timestamp: session.start,
  title: 'Protected export',
  severity: 'critical',
  status: 'open',
  kind: 'policy_violation',
  outcome: 'allowed',
  rule: { name: 'Prohibited export observed' },
  source: { index: 'alerts', id: 'alert-id' },
  ancestors: [],
  entityIds: [],
  agent: { id: session.agentId, provider: 'codex', sessionId: session.id },
  policy: {
    id: 'policy-a',
    name: 'Protect file contents',
    mode: 'enforce',
    decision: 'deny',
    engine: 'Local test',
  },
  invocation: {
    requestId: 'request-a',
    toolCallId: toolEvent.id,
    toolName: toolEvent.toolName,
    source: toolEvent.source,
    inputRecordHash: 'hash',
    inputSource: 'native.command',
    correlation: 'exact_request_id',
    input: '["/bin/zsh","-lc","cat protected-fixture.txt"]',
    inputRedacted: false,
    inputTruncated: false,
    processExitCode: 77,
  },
};
const securityResult: SecurityFindingsResult = {
  findings: [finding],
  total: 1,
  partial: false,
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  refetch: jest.fn(),
};
const security = {
  scope: {
    type: 'agent' as const,
    provider: 'codex' as const,
    agentId: session.agentId,
    sessionId: session.id,
  },
  result: securityResult,
};

it('keeps the original session and tools visible alongside connected security events', () => {
  const onSelectTool = jest.fn();
  render(
    <CodexSessionGraph
      sessions={[session]}
      selected={session}
      events={[toolEvent]}
      security={security}
      onSelectSession={jest.fn()}
      onSelectTool={onSelectTool}
    />
  );
  expect(screen.queryByRole('tab', { name: /Security path/ })).not.toBeInTheDocument();
  expect(screen.getByTestId('codexGraphSelectedSession')).toBeInTheDocument();
  expect(screen.getByTestId('codexGraphOwnerLink')).toBeInTheDocument();
  expect(screen.getByText('1 allowed despite policy')).toBeInTheDocument();
  expect(screen.getByTestId('securityGraphSessionLink')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('securityGraphEvent'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(finding);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Filter tool exec_command' }));
  expect(onSelectTool).toHaveBeenCalledWith('exec_command');
});

it.each(['isLoading', 'isRefreshing', 'unavailable'] as const)(
  'hides stale security events and their detail during %s while retaining the original graph',
  (state) => {
    const props = {
      sessions: [session],
      selected: session,
      events: [toolEvent],
      onSelectSession: jest.fn(),
      onSelectTool: jest.fn(),
    };
    const { rerender } = render(<CodexSessionGraph {...props} security={security} />);
    fireEvent.click(screen.getByTestId('securityGraphEvent'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    rerender(
      <CodexSessionGraph
        {...props}
        security={{ ...security, result: { ...securityResult, [state]: true } }}
      />
    );
    expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('codexGraphSecurityBadge')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('codexGraphSelectedSession')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter tool exec_command' })).toBeInTheDocument();
  }
);

it('collapses related branches for a security investigation and preserves the explicit expand choice during refresh', async () => {
  const children = Array.from({ length: 12 }, (_, index) => ({
    ...session,
    id: `child-${index}`,
    parentId: session.id,
    nickname: `Child ${index}`,
  }));
  const props = {
    sessions: [session, ...children],
    selected: session,
    events: [toolEvent],
    onSelectSession: jest.fn(),
    onSelectTool: jest.fn(),
  };
  const { rerender } = render(<CodexSessionGraph {...props} security={security} />);
  expect(screen.queryAllByTestId('codexGraphSession')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Related sessions (12)' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  rerender(
    <CodexSessionGraph
      {...props}
      security={{ ...security, result: { ...securityResult, isRefreshing: true } }}
    />
  );
  expect(screen.queryAllByTestId('codexGraphSession')).toHaveLength(0);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Related sessions (12)' }));
  });
  expect(screen.getAllByTestId('codexGraphSession')).toHaveLength(11);
  rerender(<CodexSessionGraph {...props} security={security} />);
  expect(screen.getAllByTestId('codexGraphSession')).toHaveLength(11);
  expect(screen.getByRole('button', { name: 'Related sessions (12)' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
});

it('does not transfer an open finding when session or space changes', () => {
  const props = {
    sessions: [session],
    selected: session,
    events: [toolEvent],
    onSelectSession: jest.fn(),
    onSelectTool: jest.fn(),
  };
  const { rerender } = render(
    <CodexSessionGraph {...props} security={{ ...security, spaceId: 'first' }} />
  );
  fireEvent.click(screen.getByTestId('securityGraphEvent'));
  rerender(<CodexSessionGraph {...props} security={{ ...security, spaceId: 'second' }} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('securityGraphEvent'));
  const next = { ...session, id: 'child' };
  rerender(
    <CodexSessionGraph
      {...props}
      sessions={[next]}
      selected={next}
      security={{
        scope: { ...security.scope, sessionId: next.id },
        result: { ...securityResult, findings: [] },
      }}
    />
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
});

it('paginates security nodes without duplicating source evidence', () => {
  const events = Array.from({ length: 13 }, (_, index) => ({
    ...toolEvent,
    id: `tool-${index}`,
  }));
  const findings = events.map((event, index) => ({
    ...finding,
    id: `finding-${index}`,
    source: { ...finding.source, id: `source-${index}` },
    invocation: finding.invocation && { ...finding.invocation, toolCallId: event.id },
  }));
  render(
    <CodexSessionGraph
      sessions={[session]}
      selected={session}
      events={events}
      security={{
        ...security,
        result: { ...securityResult, findings: [...findings, findings[0]] },
      }}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
    />
  );
  expect(screen.getAllByTestId('securityGraphEvent')).toHaveLength(6);
  expect(screen.getByText('1–6 of 13')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next security findings' }));
  expect(screen.getByText('7–12 of 13')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next security findings' }));
  expect(screen.getAllByTestId('securityGraphEvent')).toHaveLength(1);
  expect(screen.getByText('13–13 of 13')).toBeInTheDocument();
});

it('shows exact commands and policy inspection on the native call card', () => {
  const onInspectEvent = jest.fn();
  render(
    <CodexSessionGraph
      sessions={[session]}
      selected={session}
      events={[toolEvent]}
      security={security}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
      onInspectEvent={onInspectEvent}
    />
  );
  expect(screen.getByText('Tool calls with security findings')).toBeInTheDocument();
  expect(screen.getByTestId('securityGraphCommand')).toHaveTextContent('cat protected-fixture.txt');
  expect(screen.queryByTestId('securityGraphRecordedSequence')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Inspect exact tool call native-call' }));
  expect(onInspectEvent).toHaveBeenCalledWith(toolEvent);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect policy Protect file contents' }));
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(finding);
});

it('shows one Google export call with its final blocked outcome and separately inspectable policies', async () => {
  const googleSession: CodexSession = { ...session, provider: 'google_adk' };
  const googleEvent: CodexToolEvent = { ...toolEvent, provider: 'google_adk' };
  const blocked: SecurityFinding = {
    ...finding,
    kind: 'guardrail',
    outcome: 'blocked',
    agent: { id: session.agentId, provider: 'google_adk', sessionId: session.id },
    policy: finding.policy && { ...finding.policy, name: 'Google native export containment' },
  };
  const monitor: SecurityFinding = {
    ...blocked,
    id: 'monitor',
    source: { index: 'alerts', id: 'monitor' },
    kind: 'detection',
    outcome: 'unknown',
    policy: blocked.policy && { ...blocked.policy, id: 'monitor', name: 'Export monitoring' },
  };
  render(
    <CodexSessionGraph
      sessions={[googleSession]}
      selected={googleSession}
      events={[googleEvent]}
      security={{
        scope: { ...security.scope, provider: 'google_adk' },
        result: { ...securityResult, findings: [monitor, blocked], total: 2 },
      }}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
    />
  );
  expect(screen.getAllByTestId('securityGraphEvent')).toHaveLength(1);
  expect(screen.getAllByTestId('securityGraphSessionLink')).toHaveLength(1);
  expect(screen.getByTestId('codexGraphSecurityBadge')).toHaveTextContent('1 flagged call');
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
  expect(screen.queryByText('1 detected')).not.toBeInTheDocument();
  expect(screen.getByTestId('securityGraphCallEvidence')).toHaveTextContent(
    '1 tool call · 2 findings'
  );
  await act(async () => {
    fireEvent.click(screen.getByTestId('securityGraphPolicyRecords'));
  });
  expect(screen.getByText('One tool call, multiple evidence records')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Inspect policy Export monitoring' }));
  });
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(monitor);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId('securityGraphPolicyRecords'));
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Inspect policy Google native export containment' })
    );
  });
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(blocked);
});

it('keeps legacy session findings out of the call graph and explains missing attribution', () => {
  render(
    <CodexSessionGraph
      sessions={[session]}
      selected={session}
      events={[toolEvent]}
      security={{
        ...security,
        result: { ...securityResult, findings: [{ ...finding, invocation: undefined }] },
      }}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
    />
  );
  expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Session-level findings · tool attribution unavailable (1)',
    })
  );
  expect(
    screen.getByText(
      'The source links these findings to this session, but does not identify a specific prompt or tool call.'
    )
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Protected export · Allowed despite policy' })
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('does not put a finding on an unrelated or unavailable native call', () => {
  const props = {
    sessions: [session],
    selected: session,
    security,
    onSelectSession: jest.fn(),
    onSelectTool: jest.fn(),
  };
  const { rerender } = render(
    <CodexSessionGraph {...props} events={[{ ...toolEvent, id: 'other' }]} />
  );
  expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Tool evidence outside loaded activity (1)' })
  ).toBeInTheDocument();
  rerender(<CodexSessionGraph {...props} events={[]} />);
  expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
});
