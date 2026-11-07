/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentExecutionGraph } from './agent_execution_graph';
import { FindingDetails } from '../security_findings/security_findings_panel';
import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import type { AgentInventoryItem, AgentInvocation, AgentToolCall } from './types';

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
const agent: AgentInventoryItem = {
  id: 'agent-a',
  entityId: 'ai_agent:default:agent-a',
  name: 'Investigator',
  description: '',
  type: 'chat',
  readonly: false,
  configuredTools: [],
  connectorIds: [],
  subagentIds: [],
  enableElasticCapabilities: false,
  traceAliases: ['agent-a'],
};
const invocation: AgentInvocation = {
  id: 'invocation',
  spanId: 'span-a',
  traceId: 'trace-a',
  timestamp: '2026-10-13T12:00:00Z',
  outcome: 'success',
  source: { index: 'traces-test', id: 'invocation' },
};
const tool: AgentToolCall = {
  id: 'tool-a',
  spanId: 'tool-span',
  traceId: invocation.traceId,
  timestamp: invocation.timestamp,
  outcome: 'success',
  source: { index: 'traces-test', id: 'tool-a' },
  toolName: 'export',
  invocationSpanId: invocation.spanId,
  nameRedacted: false,
};
const finding: SecurityFinding = {
  id: 'finding',
  timestamp: invocation.timestamp,
  title: 'Export blocked',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  rule: { name: 'Export guardrail' },
  source: { index: 'alerts', id: 'alert-a' },
  ancestors: [],
  entityIds: [],
};
const result: SecurityFindingsResult = {
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
    provider: 'agent_builder' as const,
    agentId: agent.id,
    traceId: invocation.traceId,
  },
  result,
};

it('adds security events to the original execution map while retaining conversation and tool inspection', () => {
  const onSelectInvocation = jest.fn();
  const onSelectTool = jest.fn();
  render(
    <AgentExecutionGraph
      agent={agent}
      invocation={invocation}
      toolCalls={[tool]}
      security={security}
      conversationTitle="Investigate finance"
      onSelectInvocation={onSelectInvocation}
      onSelectTool={onSelectTool}
    />
  );
  expect(screen.queryByRole('tab', { name: /Security path/ })).not.toBeInTheDocument();
  expect(screen.getByTestId('agentGraphConversation')).toBeInTheDocument();
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('securityGraphEvent'));
  expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toBe(finding);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByTestId('agentGraphConversation'));
  expect(onSelectInvocation).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect export calls' }));
  expect(onSelectTool).toHaveBeenCalledWith(tool);
});

it.each(['isLoading', 'isRefreshing', 'unavailable'] as const)(
  'retains execution relationships while hiding cached findings during %s',
  (state) => {
    const props = {
      agent,
      invocation,
      toolCalls: [tool],
      onSelectInvocation: jest.fn(),
      onSelectTool: jest.fn(),
    };
    const { rerender } = render(<AgentExecutionGraph {...props} security={security} />);
    fireEvent.click(screen.getByTestId('securityGraphEvent'));
    rerender(
      <AgentExecutionGraph
        {...props}
        security={{ ...security, result: { ...result, [state]: true } }}
      />
    );
    expect(screen.getByTestId('agentGraphConversation')).toBeInTheDocument();
    expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agentGraphSecurityBadge')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }
);

it('does not convert tool failures into security events or transfer open details to another trace', () => {
  const props = {
    agent,
    invocation,
    toolCalls: [{ ...tool, outcome: 'failure' as const }],
    onSelectInvocation: jest.fn(),
    onSelectTool: jest.fn(),
  };
  const { rerender } = render(<AgentExecutionGraph {...props} security={security} />);
  fireEvent.click(screen.getByTestId('securityGraphEvent'));
  const next = { ...invocation, id: 'next', traceId: 'trace-b' };
  rerender(
    <AgentExecutionGraph
      {...props}
      invocation={next}
      security={{
        scope: { ...security.scope, traceId: next.traceId },
        result: { ...result, findings: [], partial: true },
      }}
    />
  );
  expect(screen.queryByTestId('securityGraphEvent')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.getByText('No linked security findings in the available evidence')
  ).toBeInTheDocument();
});
