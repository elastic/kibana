/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodexEvidence } from './codex_evidence';
import { useCodexContent } from './use_codex_content';
import type { CodexSession, CodexToolEvent } from './codex_types';
import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import { FindingDetails } from '../security_findings/security_findings_panel';

jest.mock('./use_codex_content');
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../../../common/lib/kibana', () => ({ useKibana: () => ({ services: {} }) }));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
jest.mock('../security_findings/security_findings_panel', () => ({
  FindingDetails: jest.fn(
    ({ finding, onClose }: { finding: SecurityFinding; onClose: () => void }) => (
      <div role="dialog">
        <span>{finding.title}</span>
        <button type="button" onClick={onClose}>
          {'Back to tool'}
        </button>
      </div>
    )
  ),
}));
const session: CodexSession = {
  id: 'session',
  agentId: 'agent',
  start: '2026-10-13T12:00:00Z',
  lastSeen: '2026-10-13T12:01:00Z',
  toolCount: 1,
  failures: 1,
  successes: 0,
  unknowns: 0,
  completedTurns: 1,
  abortedTurns: 0,
  tools: [],
  summaryComplete: true,
  source: { index: 'native', id: 'session' },
  fileHash: 'hash',
};
const event: CodexToolEvent = {
  id: 'call',
  sessionId: session.id,
  agentId: session.agentId,
  timestamp: session.start,
  toolName: 'exec_command',
  observationType: 'native_tool_completion',
  recordHash: 'hash',
  turnId: 'native-turn',
  outcome: 'failure',
  exitCode: 77,
  source: { index: 'native', id: 'tool-doc' },
  input: {
    text: 'cat protected-fixture.txt',
    kind: 'command',
    source: 'native.command',
    redacted: false,
    truncated: false,
  },
};
const finding: SecurityFinding = {
  id: 'alert',
  timestamp: event.timestamp,
  title: 'Protected file blocked',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  rule: { name: 'Protected files' },
  source: { index: 'alerts', id: 'alert' },
  ancestors: [],
  entityIds: [],
  agent: { id: session.agentId, provider: 'codex', sessionId: session.id },
  invocation: {
    requestId: 'request',
    toolCallId: event.id,
    toolName: event.toolName,
    source: event.source,
    inputRecordHash: 'hash',
    inputSource: 'native.command',
    correlation: 'exact_request_id',
    input: 'cat protected-fixture.txt',
    inputRedacted: false,
    inputTruncated: false,
    processExitCode: 77,
  },
};
const security: SecurityFindingsResult = {
  findings: [finding],
  total: 1,
  partial: false,
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.mocked(useCodexContent).mockReturnValue({
    event,
    session: undefined,
    isLoading: false,
    unavailable: false,
    refetch: jest.fn(),
  });
});

it('opens the policy finding from its exact recorded tool input and returns to the tool', () => {
  render(<CodexEvidence session={session} event={event} security={security} onClose={jest.fn()} />);
  expect(screen.getByText('cat protected-fixture.txt')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Blocked · Protected files' }));
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(finding);
  fireEvent.click(screen.getByRole('button', { name: 'Back to tool' }));
  expect(screen.getByText('cat protected-fixture.txt')).toBeInTheDocument();
});

it('does not show findings on another tool document or on session prompt evidence', () => {
  const { rerender } = render(
    <CodexEvidence
      session={session}
      event={{ ...event, source: { ...event.source, id: 'other' } }}
      security={security}
      onClose={jest.fn()}
    />
  );
  expect(
    screen.queryByRole('button', { name: 'Blocked · Protected files' })
  ).not.toBeInTheDocument();
  rerender(<CodexEvidence session={session} security={security} onClose={jest.fn()} />);
  expect(
    screen.queryByRole('button', { name: 'Blocked · Protected files' })
  ).not.toBeInTheDocument();
});

it('shows the exact captured MCP result and withholds it when evidence becomes unavailable', () => {
  const connection: CodexSession = { ...session, provider: 'claude_desktop' };
  const mcpEvent: CodexToolEvent = {
    ...event,
    provider: 'claude_desktop',
    toolName: 'read_customer_reference',
    output: {
      text: '{"reference":"DEMO-001"}',
      source: 'claude_desktop.mcp.result.value',
      redacted: false,
      truncated: false,
    },
  };
  jest.mocked(useCodexContent).mockReturnValue({
    event: mcpEvent,
    session: undefined,
    isLoading: false,
    unavailable: false,
    refetch: jest.fn(),
  });
  const { rerender } = render(
    <CodexEvidence session={connection} event={mcpEvent} onClose={jest.fn()} />
  );
  expect(screen.getByText('Recorded tool result')).toBeInTheDocument();
  expect(screen.getByText('{"reference":"DEMO-001"}')).toBeInTheDocument();
  expect(screen.getByText('MCP connection ID')).toBeInTheDocument();
  jest.mocked(useCodexContent).mockReturnValue({
    event: mcpEvent,
    session: undefined,
    isLoading: false,
    unavailable: true,
    refetch: jest.fn(),
  });
  rerender(<CodexEvidence session={connection} event={mcpEvent} onClose={jest.fn()} />);
  expect(screen.queryByText('Recorded tool result')).not.toBeInTheDocument();
  expect(screen.queryByText('{"reference":"DEMO-001"}')).not.toBeInTheDocument();
});
