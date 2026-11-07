/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SecurityFinding } from '../security_findings/types';
import type { AgentToolCall } from './types';
import { SecurityGraphNodes, SecurityGraphSummary } from './security_graph_nodes';

jest.mock('../security_findings/security_findings_panel', () => ({
  FindingDetails: () => null,
  activityLabel: (action: string) => action,
}));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

it('counts a blocked policy violation only as blocked, never as allowed despite policy', () => {
  const finding: SecurityFinding = {
    id: 'blocked-policy-violation',
    timestamp: '2026-10-14T12:00:00Z',
    title: 'Export blocked',
    severity: 'high',
    status: 'open',
    kind: 'policy_violation',
    outcome: 'blocked',
    rule: { name: 'Restricted export' },
    source: { index: 'alerts', id: 'blocked-policy-violation' },
    ancestors: [],
    entityIds: [],
  };
  render(
    <SecurityGraphSummary
      result={{
        findings: [finding],
        total: 1,
        partial: false,
        isLoading: false,
        isRefreshing: false,
        unavailable: false,
        refetch: jest.fn(),
      }}
    />
  );
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
  expect(screen.queryByText(/allowed despite policy/)).not.toBeInTheDocument();
  expect(screen.queryByText('1 detected')).not.toBeInTheDocument();
});

it.each(['native-tool-call', undefined])(
  'inspects the matched Agent Builder call using its native ID or span fallback (%s)',
  (toolCallId) => {
    const call: AgentToolCall = {
      id: 'trace-one:tool-span',
      traceId: 'trace-one',
      spanId: 'tool-span',
      invocationSpanId: 'invocation-span',
      toolCallId,
      toolName: 'platform.core.execute_esql',
      nameRedacted: false,
      timestamp: '2026-10-14T12:00:00Z',
      outcome: 'success',
      source: { index: 'traces-agent_builder.otel-default', id: 'native-tool-document' },
    };
    const expectedId = toolCallId ?? call.spanId;
    const finding: SecurityFinding = {
      id: 'finding-one',
      timestamp: call.timestamp,
      title: 'AI policy match',
      severity: 'high',
      status: 'open',
      kind: 'detection',
      outcome: 'unknown',
      rule: { name: 'Restricted tool use' },
      source: { index: 'alerts', id: 'finding-one' },
      ancestors: [],
      entityIds: [],
      agent: {
        provider: 'agent_builder',
        id: 'agent-one',
        sessionId: 'trace-one:invocation-span',
      },
      invocation: {
        correlation: 'exact_native_observation',
        toolCallId: expectedId,
        toolName: call.toolName,
        traceId: call.traceId,
        spanId: call.spanId,
        invocationSpanId: call.invocationSpanId,
        source: call.source,
        input: 'FROM protected_customer_data',
        inputSource: 'attributes.tool.input',
        inputRecordHash: 'record-hash',
        inputRedacted: false,
        inputTruncated: false,
      },
    };
    const onInspectAgentCall = jest.fn();
    render(
      <SecurityGraphNodes
        scope={{ type: 'agent', provider: 'agent_builder', agentId: 'agent-one' }}
        result={{
          findings: [finding],
          total: 1,
          partial: false,
          isLoading: false,
          isRefreshing: false,
          unavailable: false,
          refetch: jest.fn(),
        }}
        contextKey="agent-one:invocation-span"
        source={{ x: 0, y: 0 }}
        left={0}
        top={0}
        width={800}
        height={400}
        invocations
        agentCalls={[call]}
        onInspectAgentCall={onInspectAgentCall}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: `Inspect exact tool call ${expectedId}` }));
    expect(onInspectAgentCall).toHaveBeenCalledTimes(1);
    expect(onInspectAgentCall).toHaveBeenCalledWith(call);
  }
);
