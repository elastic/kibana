/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSecurityFindings } from '../security_findings/use_security_findings';
import type { SecurityFindingsResult } from '../security_findings/types';
import { SecurityGraphNodes } from './security_graph_nodes';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AgentDossier } from './agent_dossier';
import { AgentEvidenceButton } from './agent_evidence';
import { useAgentActivity } from './use_agent_activity';
import type { AgentActivity, AgentInventoryItem, AgentInvocation, AgentToolCall } from './types';

jest.mock('../security_findings/use_security_findings');
jest.mock('./security_graph_nodes', () => ({
  SecurityGraphNodes: jest.fn(() => <div data-test-subj="securityGraphNodes" />),
  SecurityGraphSummary: () => null,
}));
jest.mock('../security_findings/security_findings_panel', () => ({
  SecurityFindingsPanel: jest.fn(() => null),
}));
jest.mock('./use_agent_activity');
jest.mock('./use_agent_actor', () => ({
  useAgentActor: () => ({ actor: undefined, isLoading: false, unavailable: false }),
}));
jest.mock('./use_agent_conversations', () => ({
  useAgentConversations: () => ({
    conversations: [],
    isLoading: false,
    unavailable: false,
    partial: false,
  }),
}));
jest.mock('./agent_content_inspector', () => ({
  AgentContentInspector: () => <div data-test-subj="agentContentInspector" />,
}));
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'marketing' }));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
const mockGetRedirectUrl = jest.fn(() => '/app/discover#/trace-evidence');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      share: { url: { locators: { get: () => ({ getRedirectUrl: mockGetRedirectUrl }) } } },
    },
  }),
}));

const mockActivity = jest.mocked(useAgentActivity);
const agent: AgentInventoryItem = {
  id: 'agent-id',
  entityId: 'ai_agent:marketing:agent-id',
  name: 'Dossier agent',
  description: '',
  type: 'chat',
  readonly: false,
  configuredTools: [
    {
      id: 'configured-only-tool',
      type: 'mcp',
      connectorId: 'connector-reference',
      definitionAvailable: true,
    },
  ],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: ['agent-id'],
};
const invocation = (spanId: string, traceId: string): AgentInvocation => ({
  id: `${traceId}:${spanId}`,
  traceId,
  spanId,
  timestamp: '2026-10-12T20:00:00Z',
  outcome: 'unknown',
  source: { index: 'traces-agent_builder.otel-marketing', id: `document-${spanId}` },
});
const invocationOne = invocation('span-one', 'trace-one');
const invocationTwo = invocation('span-two', 'trace-two');
const tool = (name: string, parent: AgentInvocation): AgentToolCall => ({
  id: name,
  spanId: name,
  traceId: parent.traceId,
  timestamp: parent.timestamp,
  outcome: 'success',
  source: { index: parent.source.index, id: `document-${name}` },
  toolName: name,
  invocationSpanId: parent.spanId,
  nameRedacted: false,
});
const activity: AgentActivity = {
  invocations: [invocationOne, invocationTwo],
  toolCalls: [
    tool('observed-first-tool', invocationOne),
    tool('observed-second-tool', invocationTwo),
    { ...tool('other-trace-tool', invocationOne), traceId: 'another-trace' },
  ],
  sampledInvocations: 2,
  totalInvocations: 2,
  tracesInspected: 2,
  unattributedToolCalls: 0,
  truncated: false,
  lookbackDays: 30,
  privacy: { hasHashedAgentId: false, hasRedactedToolNames: false, hasReportedUser: false },
  limits: { invocations: 100, traces: 20, spans: 2000 },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSecurityFindings).mockReturnValue({
    findings: [],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: true,
    refetch: jest.fn(),
  });
  mockActivity.mockReturnValue({
    activity,
    status: 'available',
    isLoading: false,
    isRefreshing: false,
    refetch: jest.fn(),
  });
});

it('shows only tool calls matching both the selected invocation and trace', () => {
  render(<AgentDossier agent={agent} />);
  expect(screen.getAllByText('observed-first-tool').length).toBeGreaterThan(0);
  expect(screen.queryByText('observed-second-tool')).not.toBeInTheDocument();
  expect(screen.queryByText('other-trace-tool')).not.toBeInTheDocument();
  const select = screen.getByRole('combobox', { name: 'Select an agent invocation' });
  const second = within(select).getByRole('option', { name: /span-two/ });
  fireEvent.change(select, { target: { value: second.getAttribute('value') } });
  expect(screen.getAllByText('observed-second-tool').length).toBeGreaterThan(0);
  expect(screen.queryByText('observed-first-tool')).not.toBeInTheDocument();
});

it('keeps configured access separate from observed use and unresolved credential scope', () => {
  render(<AgentDossier agent={agent} />);
  expect(screen.queryByText('configured-only-tool')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('agentAccessTab'));
  expect(screen.getByText('configured-only-tool')).toBeInTheDocument();
  expect(screen.getByText('connector-reference')).toBeInTheDocument();
  expect(screen.queryByText('observed-first-tool')).not.toBeInTheDocument();
  expect(screen.getByText('Delegated credential scope is not established')).toBeInTheDocument();
  expect(
    screen.getByText(/do not establish historical permission, credential scope, or resource access/)
  ).toBeInTheDocument();
});

it('distinguishes failed activity retrieval from no recorded activity', () => {
  mockActivity.mockReturnValue({
    status: 'unavailable',
    isLoading: false,
    isRefreshing: false,
    refetch: jest.fn(),
  });
  render(<AgentDossier agent={agent} />);
  expect(screen.getByText('Execution evidence unavailable')).toBeInTheDocument();
  expect(screen.queryByText('No recorded invocations in this window')).not.toBeInTheDocument();
  const count = screen.getByText('Invocations in 30 days');
  expect(count.nextElementSibling).toHaveTextContent('—');
});

it('shows bounded-evidence limits without claiming the sample is complete', () => {
  mockActivity.mockReturnValue({
    activity: { ...activity, totalInvocations: 250, truncated: true },
    status: 'partial',
    isLoading: false,
    isRefreshing: false,
    refetch: jest.fn(),
  });
  render(<AgentDossier agent={agent} />);
  expect(screen.getByText(/2 of 250 invocations shown/)).toBeInTheDocument();
  expect(screen.getByText(/Trace limits or missing parents/)).toBeInTheDocument();
});

it('opens metadata evidence and builds a metadata-only, trace-scoped Discover link', () => {
  render(<AgentEvidenceButton event={invocationOne} />);
  fireEvent.click(screen.getByTestId('agentInspectEvidence'));
  const modal = screen.getByRole('dialog');
  expect(within(modal).getByText('trace-one')).toBeInTheDocument();
  expect(within(modal).getByText('document-span-one')).toBeInTheDocument();
  expect(within(modal).getByText('traces-agent_builder.otel-marketing')).toBeInTheDocument();
  expect(within(modal).getByRole('link', { name: 'Open trace in Discover' })).toHaveAttribute(
    'href',
    '/app/discover#/trace-evidence'
  );
  expect(mockGetRedirectUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      dataViewSpec: { title: invocationOne.source.index, timeFieldName: '@timestamp' },
      query: { language: 'kuery', query: 'trace_id: "trace-one"' },
      columns: ['@timestamp', 'name', 'attributes.gen_ai.operation.name', 'span_id'],
    })
  );
  expect(modal).not.toHaveTextContent(/prompt|arguments|tool result/i);
});

it('uses the fresh activity total in its header instead of a stale inventory count', () => {
  render(
    <AgentDossier agent={{ ...agent, activity: { invocations: 999, failedInvocations: 0 } }} />
  );
  const count = screen.getByText('Invocations in 30 days');
  expect(count.nextElementSibling).toHaveTextContent(/^2$/);
  expect(count.nextElementSibling).not.toHaveTextContent('999');
});

it('opens recorded execution content from a tool node and closes it when the invocation changes', () => {
  render(<AgentDossier agent={agent} />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect observed-first-tool calls' }));
  expect(screen.getByTestId('agentContentInspector')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Select an agent invocation' }), {
    target: { value: invocationTwo.id },
  });
  expect(screen.queryByTestId('agentContentInspector')).not.toBeInTheDocument();
});

it('keeps descriptive identity details in configured access so the graph stays prominent', () => {
  render(
    <AgentDossier
      agent={{
        ...agent,
        description: 'Detailed agent configuration description',
        accessMode: 'private',
      }}
    />
  );
  expect(screen.getByTestId('agentExecutionGraph')).toBeInTheDocument();
  expect(screen.queryByText('Detailed agent configuration description')).not.toBeInTheDocument();
  expect(screen.queryByText('Agent ID')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTestId('agentAccessTab'));
  expect(screen.getByText('Detailed agent configuration description')).toBeInTheDocument();
  expect(screen.getByText('Agent ID')).toBeInTheDocument();
});

it('scopes map security findings to the exact selected Agent Builder invocation', () => {
  render(<AgentDossier agent={agent} />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    {
      type: 'agent',
      provider: 'agent_builder',
      agentId: agent.id,
      traceId: invocationOne.traceId,
      sessionId: invocationOne.id,
    },
    'marketing'
  );
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].scope).toEqual({
    type: 'agent',
    provider: 'agent_builder',
    agentId: agent.id,
    traceId: invocationOne.traceId,
    sessionId: invocationOne.id,
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Select an agent invocation' }), {
    target: { value: invocationTwo.id },
  });
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    {
      type: 'agent',
      provider: 'agent_builder',
      agentId: agent.id,
      traceId: invocationTwo.traceId,
      sessionId: invocationTwo.id,
    },
    'marketing'
  );
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].scope).toEqual({
    type: 'agent',
    provider: 'agent_builder',
    agentId: agent.id,
    traceId: invocationTwo.traceId,
    sessionId: invocationTwo.id,
  });
});

it('disables trace-specific security queries without an available invocation', () => {
  mockActivity.mockReturnValue({
    status: 'unavailable',
    isLoading: false,
    isRefreshing: false,
    refetch: jest.fn(),
  });
  render(<AgentDossier agent={agent} />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    { type: 'agent', provider: 'agent_builder', agentId: agent.id, traceId: '', sessionId: '' },
    undefined
  );
  expect(SecurityGraphNodes).not.toHaveBeenCalled();
});

it('keeps security evidence stable during activity refresh and forwards real security refreshes', () => {
  const evidence: SecurityFindingsResult = {
    findings: [],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: true,
    refetch: jest.fn(),
  };
  jest.mocked(useSecurityFindings).mockReturnValue(evidence);
  const { rerender } = render(<AgentDossier agent={agent} />);
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].result).toBe(evidence);
  mockActivity.mockReturnValue({
    activity,
    status: 'available',
    isLoading: false,
    isRefreshing: true,
    refetch: jest.fn(),
  });
  rerender(<AgentDossier agent={agent} />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    {
      type: 'agent',
      provider: 'agent_builder',
      agentId: agent.id,
      traceId: invocationOne.traceId,
      sessionId: invocationOne.id,
    },
    'marketing'
  );
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].result).toBe(evidence);
  const refreshingEvidence = { ...evidence, isRefreshing: true };
  jest.mocked(useSecurityFindings).mockReturnValue(refreshingEvidence);
  rerender(<AgentDossier agent={agent} />);
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].result).toBe(refreshingEvidence);
});

it('changes security session scope between sibling invocations in the same trace', () => {
  const sibling = invocation('span-sibling', invocationOne.traceId);
  mockActivity.mockReturnValue({
    activity: {
      ...activity,
      invocations: [invocationOne, sibling],
      toolCalls: [tool('first-tool', invocationOne), tool('sibling-tool', sibling)],
    },
    status: 'available',
    isLoading: false,
    isRefreshing: false,
    refetch: jest.fn(),
  });
  render(<AgentDossier agent={agent} />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    expect.objectContaining({ traceId: invocationOne.traceId, sessionId: invocationOne.id }),
    'marketing'
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Select an agent invocation' }), {
    target: { value: sibling.id },
  });
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    expect.objectContaining({ traceId: invocationOne.traceId, sessionId: sibling.id }),
    'marketing'
  );
  expect(jest.mocked(SecurityGraphNodes).mock.calls.at(-1)?.[0].scope).toEqual({
    type: 'agent',
    provider: 'agent_builder',
    agentId: agent.id,
    traceId: sibling.traceId,
    sessionId: sibling.id,
  });
});

it('opens the exact older invocation selected from a finding', () => {
  render(<AgentDossier agent={agent} initialInvocationId={invocationTwo.id} />);
  expect(screen.getByRole('combobox', { name: 'Select an agent invocation' })).toHaveValue(
    invocationTwo.id
  );
  expect(screen.getAllByText('observed-second-tool').length).toBeGreaterThan(0);
  expect(screen.queryByText('observed-first-tool')).not.toBeInTheDocument();
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    expect.objectContaining({ traceId: invocationTwo.traceId, sessionId: invocationTwo.id }),
    'marketing'
  );
});

it('does not replace an unavailable finding invocation with the latest activity', () => {
  render(<AgentDossier agent={agent} initialInvocationId="missing-trace:missing-span" />);
  expect(
    screen.getByText('The selected invocation is not in the loaded activity')
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Invocation missing-trace:missing-span was not returned/)
  ).toBeInTheDocument();
  expect(screen.queryByTestId('agentExecutionGraph')).not.toBeInTheDocument();
  expect(screen.queryByText('observed-first-tool')).not.toBeInTheDocument();
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    expect.objectContaining({ traceId: '', sessionId: '' }),
    undefined
  );
  expect(SecurityGraphNodes).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Show latest available invocation' }));
  expect(screen.getByRole('combobox', { name: 'Select an agent invocation' })).toHaveValue(
    invocationOne.id
  );
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    expect.objectContaining({ traceId: invocationOne.traceId, sessionId: invocationOne.id }),
    'marketing'
  );
});
