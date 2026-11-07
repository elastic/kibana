/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CapturedAgentText, CodexSessionPrompts } from './codex_content';
import { CodexEvidence } from './codex_evidence';
import { useCodexContent } from './use_codex_content';
import type { CodexSession, CodexToolEvent } from './codex_types';

jest.mock('./use_codex_content');
jest.mock('../../../../common/lib/kibana', () => ({ useKibana: () => ({ services: {} }) }));
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test' }));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
const session: CodexSession = {
  id: 'actual-session',
  agentId: 'install',
  title: 'Recorded source title',
  start: '2026-10-12T12:00:00Z',
  lastSeen: '2026-10-12T12:10:00Z',
  toolCount: 1,
  failures: 0,
  successes: 1,
  unknowns: 0,
  completedTurns: 1,
  abortedTurns: 0,
  tools: [],
  summaryComplete: true,
  source: { index: 'logs-codex.entity_intelligence-test', id: 'summary' },
  fileHash: 'hash',
};

it('renders captured commands with defensive credential filtering and bounded-content indicators', () => {
  render(
    <CapturedAgentText
      title="Recorded command"
      value={{
        text: 'curl --password ExampleSecret! localhost',
        source: 'item_completed.CommandExecution.command',
        redacted: false,
        truncated: true,
      }}
    />
  );
  expect(screen.getByText('Recorded command')).toBeInTheDocument();
  expect(screen.getByText('Credentials redacted')).toBeInTheDocument();
  expect(screen.getByText('Truncated')).toBeInTheDocument();
  expect(document.body.textContent).not.toContain('ExampleSecret!');
  expect(document.body.textContent).toContain('curl --password [REDACTED] localhost');
});

it('shows recorded prompts and their source instead of manufacturing a prompt for metadata-only sessions', () => {
  const { rerender } = render(<CodexSessionPrompts session={session} />);
  expect(screen.getByText(/snapshot contains metadata only/)).toBeInTheDocument();
  rerender(
    <CodexSessionPrompts
      session={{
        ...session,
        contentMode: 'redacted_local',
        promptsTotal: 1,
        prompts: [
          {
            id: 'prompt',
            timestamp: session.start,
            text: 'Investigate actual tool activity',
            source: 'item_completed.UserMessage',
            redacted: false,
            truncated: false,
          },
        ],
      }}
    />
  );
  expect(document.body.textContent).toContain('Investigate actual tool activity');
  expect(screen.getByText('1 of 1 recorded prompts · Most recent first')).toBeInTheDocument();
});

it('opens exact lazy-loaded tool input, and hides stale content on access failure', () => {
  const event: CodexToolEvent = {
    id: 'tool-item',
    agentId: session.agentId,
    sessionId: session.id,
    toolName: 'exec_command',
    timestamp: session.lastSeen,
    outcome: 'success',
    source: { index: session.source.index, id: 'tool-document' },
  };
  jest.mocked(useCodexContent).mockReturnValue({
    session: undefined,
    event: {
      ...event,
      input: {
        text: 'node --version',
        kind: 'command',
        source: 'item_completed.CommandExecution.command',
        redacted: false,
        truncated: false,
      },
    },
    isLoading: false,
    unavailable: false,
    refetch: jest.fn(),
  });
  const { rerender } = render(
    <CodexEvidence session={session} event={event} onClose={jest.fn()} />
  );
  expect(document.body.textContent).toContain('node --version');
  expect(jest.mocked(useCodexContent)).toHaveBeenCalledWith('test', session, event);
  jest.mocked(useCodexContent).mockReturnValue({
    session: undefined,
    event: undefined,
    isLoading: false,
    unavailable: true,
    refetch: jest.fn(),
  });
  rerender(<CodexEvidence session={session} event={event} onClose={jest.fn()} />);
  expect(document.body.textContent).not.toContain('node --version');
});
