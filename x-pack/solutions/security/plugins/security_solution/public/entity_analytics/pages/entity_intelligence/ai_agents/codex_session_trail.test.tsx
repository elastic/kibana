/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodexSessionTrail } from './codex_session_trail';
import type { CodexToolEvent } from './codex_types';
import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import { FindingDetails } from '../security_findings/security_findings_panel';

jest.mock('../security_findings/security_findings_panel', () => ({
  FindingDetails: jest.fn(({ finding }: { finding: SecurityFinding }) => (
    <div role="dialog">{finding.title}</div>
  )),
}));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

const events: CodexToolEvent[] = [
  {
    id: 'call-ok',
    agentId: 'install-a',
    sessionId: 'session-a',
    toolName: 'read_file',
    timestamp: '2026-10-12T10:00:00Z',
    outcome: 'success',
    durationMs: 25,
    source: { index: 'codex-test', id: 'ok' },
  },
  {
    id: 'call-fail',
    agentId: 'install-a',
    sessionId: 'session-a',
    toolName: 'shell',
    timestamp: '2026-10-12T10:01:00Z',
    outcome: 'failure',
    source: { index: 'codex-test', id: 'fail' },
  },
  {
    id: 'call-unknown',
    agentId: 'install-a',
    sessionId: 'session-a',
    toolName: 'mcp.query',
    timestamp: '2026-10-12T10:02:00Z',
    outcome: 'unknown',
    source: { index: 'codex-test', id: 'unknown' },
  },
];

it('filters recorded failures and opens the exact indexed tool evidence', () => {
  const inspect = jest.fn();
  render(<CodexSessionTrail events={events} complete onInspect={inspect} />);
  fireEvent.click(screen.getByRole('button', { name: 'Failed' }));
  expect(screen.queryByRole('button', { name: 'read_file' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'shell' }));
  expect(inspect).toHaveBeenCalledWith(events[1]);
  expect(screen.getByText('1 of 3 interactions · Snapshot loaded')).toBeInTheDocument();
});

it('keeps unknown outcomes distinct and exposes incomplete collection', () => {
  render(<CodexSessionTrail events={events} complete={false} onInspect={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Unknown' }));
  expect(screen.getByText('Outcome not recorded')).toBeInTheDocument();
  expect(screen.getByText(/Partial evidence/)).toBeInTheDocument();
  expect(screen.queryByText('Completed')).not.toBeInTheDocument();
});

it('supports tool and identifier search without exposing unrelated interactions', () => {
  render(<CodexSessionTrail events={events} complete onInspect={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Search tool interactions'), {
    target: { value: 'call-unknown' },
  });
  expect(screen.getByRole('button', { name: 'mcp.query' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'shell' })).not.toBeInTheDocument();
});

it('applies a map-selected tool and reports changes back to the map owner', () => {
  const change = jest.fn();
  const { rerender } = render(
    <CodexSessionTrail
      events={events}
      complete
      onInspect={jest.fn()}
      toolFilter="shell"
      onToolFilterChange={change}
    />
  );
  expect(screen.getByRole('button', { name: 'shell' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'read_file' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Filter by tool'), { target: { value: '' } });
  expect(change).toHaveBeenCalledWith('');
  rerender(
    <CodexSessionTrail
      events={events}
      complete
      onInspect={jest.fn()}
      toolFilter=""
      onToolFilterChange={change}
    />
  );
  expect(screen.getByRole('button', { name: 'read_file' })).toBeInTheDocument();
});

it('keeps a map-selected tool visible when none of its events are in the loaded sample', () => {
  render(
    <CodexSessionTrail
      events={events}
      complete={false}
      onInspect={jest.fn()}
      toolFilter="missing-from-sample"
      onToolFilterChange={jest.fn()}
    />
  );
  expect(screen.getByLabelText('Filter by tool')).toHaveValue('missing-from-sample');
  expect(screen.getByRole('option', { name: 'missing-from-sample' })).toBeInTheDocument();
  expect(screen.getByText('0 of 3 interactions · Partial evidence')).toBeInTheDocument();
});

it('attaches policy findings only to the exact native activity row and filters to those calls', () => {
  const native: CodexToolEvent = {
    ...events[0],
    observationType: 'native_tool_completion',
    recordHash: 'hash',
    turnId: 'native-turn',
    exitCode: 77,
    input: {
      text: '["/bin/zsh","-lc","cat protected-fixture.txt"]',
      kind: 'command',
      source: 'item_completed.CommandExecution.command',
      redacted: false,
      truncated: false,
      recordHash: 'hash',
    },
  };
  const finding: SecurityFinding = {
    id: 'alert',
    timestamp: native.timestamp,
    title: 'Protected file was blocked',
    severity: 'high',
    status: 'open',
    kind: 'guardrail',
    outcome: 'blocked',
    rule: { name: 'Protected file rule' },
    source: { index: 'alerts', id: 'alert-id' },
    ancestors: [],
    entityIds: [],
    agent: { id: native.agentId, provider: 'codex', sessionId: native.sessionId },
    policy: {
      id: 'policy',
      name: 'Protect workspace secrets',
      mode: 'enforce',
      decision: 'deny',
      engine: 'Local gateway',
    },
    invocation: {
      requestId: 'request',
      toolCallId: native.id,
      toolName: native.toolName,
      source: native.source,
      inputRecordHash: 'hash',
      inputSource: 'native.command',
      correlation: 'exact_request_id',
      input: native.input?.text ?? '',
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
  const inspect = jest.fn();
  const { rerender } = render(
    <CodexSessionTrail
      events={[native, ...events.slice(1)]}
      complete
      security={security}
      onInspect={inspect}
    />
  );
  expect(screen.getAllByTestId('toolActivitySecurityFinding')).toHaveLength(1);
  expect(screen.getByText('Runtime completion · cat protected-fixture.txt')).toBeInTheDocument();
  expect(screen.queryByText(/\/bin\/zsh/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'With findings' }));
  expect(screen.getByRole('button', { name: 'read_file' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'shell' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('toolActivitySecurityFinding'));
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(finding);
  rerender(
    <CodexSessionTrail
      events={[native]}
      complete
      security={{ ...security, unavailable: true }}
      onInspect={inspect}
    />
  );
  expect(screen.queryByTestId('toolActivitySecurityFinding')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  rerender(
    <CodexSessionTrail events={[native]} complete security={security} onInspect={inspect} />
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
