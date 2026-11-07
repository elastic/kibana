/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentContentInspector } from './agent_content_inspector';
import { useAgentConversationContent } from './use_agent_conversations';
import type { AgentConversationDetail } from './agent_conversations';
import type { AgentInvocation, AgentToolCall } from './types';

jest.mock('./use_agent_conversations');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: { basePath: { prepend: (path: string) => `/s/marketing${path}` } } },
  }),
}));
const mockContent = jest.mocked(useAgentConversationContent);
const invocation: AgentInvocation = {
  id: 'trace:agent-span',
  traceId: 'trace',
  spanId: 'agent-span',
  timestamp: '2026-10-12T12:00:00Z',
  outcome: 'unknown',
  source: { index: 'index', id: 'agent-doc' },
  conversationReference: 'conversation',
};
const call: AgentToolCall = {
  ...invocation,
  id: 'trace:tool-span',
  spanId: 'tool-span',
  invocationSpanId: 'agent-span',
  toolName: 'execute_esql',
  toolCallId: 'call-id',
  nameRedacted: false,
};
const detail: AgentConversationDetail = {
  status: 'matched',
  conversationId: 'conversation',
  title: 'Recorded conversation title',
  roundId: 'round-id',
  prompt: { text: 'Find recorded entity activity', redacted: false, truncated: false },
  tool: {
    id: 'execute_esql',
    callId: 'call-id',
    arguments: { text: '{"query":"FROM logs-* | LIMIT 5"}', redacted: false, truncated: false },
    results: { text: '{"rows":5}', redacted: false, truncated: true },
  },
};
const props = {
  spaceId: 'marketing',
  agentId: 'agent',
  conversationId: 'conversation',
  invocation,
  calls: [call],
  selectedCallId: call.id,
  onSelectCall: jest.fn(),
  onClose: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  mockContent.mockReturnValue({ detail, isLoading: false, unavailable: false });
});

it('shows source-grounded arguments, prompt, source IDs, and truncation with a space-aware source link', () => {
  render(<AgentContentInspector {...props} />);
  expect(screen.getByRole('dialog')).toHaveTextContent('FROM logs-* | LIMIT 5');
  expect(screen.getByRole('dialog')).toHaveTextContent('Find recorded entity activity');
  expect(screen.getByText('Content shortened for display.')).toBeInTheDocument();
  expect(screen.getByText('round-id')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open conversation' })).toHaveAttribute(
    'href',
    '/s/marketing/app/agent_builder/agents/agent/conversations/conversation'
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Select execution content' }), {
    target: { value: 'round' },
  });
  expect(props.onSelectCall).toHaveBeenCalledWith(undefined);
});

it('hides cached title, content, and content-source link during access failure', () => {
  const { rerender } = render(<AgentContentInspector {...props} />);
  mockContent.mockReturnValue({ detail, isLoading: false, unavailable: true });
  rerender(<AgentContentInspector {...props} />);
  expect(screen.getByText('Conversation content unavailable')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).not.toHaveTextContent('Recorded conversation title');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('FROM logs-* | LIMIT 5');
  expect(screen.queryByRole('link', { name: 'Open conversation' })).not.toBeInTheDocument();
});

it('reports ambiguous joins without substituting unrelated call arguments', () => {
  mockContent.mockReturnValue({
    detail: { ...detail, status: 'tool_ambiguous', tool: undefined },
    isLoading: false,
    unavailable: false,
  });
  render(<AgentContentInspector {...props} />);
  expect(screen.getByText('No unique recorded content match')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tool arguments' })).not.toBeInTheDocument();
});
