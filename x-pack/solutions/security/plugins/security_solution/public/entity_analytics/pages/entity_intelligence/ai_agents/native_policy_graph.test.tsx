/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsePolicyEvidence, parseSecurityInvocation } from '../security_findings/evidence_model';
import type {
  SecurityControlFields,
  SecurityFinding,
  SecurityInvocationFields,
} from '../security_findings/types';
import type { CodexToolEvent } from './codex_types';
import type { AgentToolCall } from './types';
import { findingMatchesAgentToolCall, findingMatchesToolEvent } from './security_graph_model';

const clause = {
  id: 'native-tool-match',
  name: 'Recorded tool call condition',
  condition: 'Input contains protected.csv',
  expected: 'deny' as const,
};
const snapshot: SecurityControlFields = {
  id: 'policy-1',
  name: 'Protected customer data',
  version: '2',
  mode: 'monitor',
  decision: 'deny',
  policy_sha256: 'a'.repeat(64),
  clause,
  definition: {
    policy_id: 'policy-1',
    policy_version: 2,
    description: 'Protected customer data',
    scope: 'Detection only; providers: cursor, agent_builder',
    clauses: [clause],
  },
};
const captured = {
  text: '{"path":"protected.csv"}',
  kind: 'arguments' as const,
  source: 'bubble.toolFormerData.params',
  redacted: false,
  truncated: false,
};
const nativeFields: SecurityInvocationFields = {
  tool_call_id: 'call-1',
  tool_name: 'read_file',
  observation_index: 'logs-cursor.entity_intelligence-default',
  observation_id: '_cursor-native-document',
  input_record_hash: 'a'.repeat(64),
  input_source: captured.source,
  correlation: 'exact_native_observation',
  input: captured.text,
  input_redacted: false,
  input_truncated: false,
};
const requireInvocation = (
  value: SecurityFinding['invocation']
): NonNullable<SecurityFinding['invocation']> => {
  if (!value) throw new Error('The native fixture must parse');
  return value;
};
const cursorAgent = {
  id: 'cursor-installation',
  provider: 'cursor' as const,
  sessionId: 'cursor-session',
};
const cursorInvocation = requireInvocation(
  parseSecurityInvocation({ invocation: nativeFields }, cursorAgent, 'default')
);
const finding: SecurityFinding = {
  id: 'finding-1',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Matched AI policy',
  severity: 'high',
  status: 'open',
  kind: 'detection',
  outcome: 'unknown',
  rule: { name: 'AI policy match' },
  source: { index: 'alerts', id: 'finding-1' },
  ancestors: [],
  entityIds: [],
  agent: cursorAgent,
  invocation: cursorInvocation,
};
const cursorEvent: CodexToolEvent = {
  provider: 'cursor',
  agentId: 'cursor-installation',
  sessionId: 'cursor-session',
  id: 'call-1',
  timestamp: '2026-10-14T12:00:00Z',
  toolName: 'read_file',
  outcome: 'success',
  observationType: 'native_tool_completion',
  recordHash: 'b'.repeat(64),
  source: { index: 'logs-cursor.entity_intelligence-default', id: '_cursor-native-document' },
  input: captured,
};

it('preserves a numeric policy revision snapshot and its matched clause', () => {
  expect(parsePolicyEvidence(snapshot)).toMatchObject({
    version: '2',
    clause,
    definition: snapshot.definition,
  });
});

it.each([
  { policy_id: 'different-policy', policy_version: 2 },
  { policy_id: 'policy-1', policy_version: 3 },
  { policy_id: 'policy-1', policy_version: 2.5 },
])('rejects conflicting policy snapshot identity or revision: %o', (change) => {
  const evidence = parsePolicyEvidence({
    ...snapshot,
    definition: { ...snapshot.definition, ...change },
  });
  expect(evidence.definition).toBeUndefined();
  expect(evidence.clause).toBeUndefined();
});

it('keeps underscore-prefixed native Cursor document IDs without inventing an exit code', () => {
  expect(cursorInvocation).toMatchObject({
    source: cursorEvent.source,
    toolCallId: 'call-1',
    correlation: 'exact_native_observation',
  });
  expect(cursorInvocation.processExitCode).toBeUndefined();
});

it('matches a completed Cursor bubble when only its surrounding record hash changed', () => {
  expect(findingMatchesToolEvent(finding, cursorEvent)).toBe(true);
});

it.each<Partial<CodexToolEvent>>([
  { source: { ...cursorEvent.source, id: 'another-document' } },
  { source: { ...cursorEvent.source, index: 'logs-cursor.entity_intelligence-other' } },
  { id: 'another-call' },
  { provider: 'codex' },
  { agentId: 'another-installation' },
  { sessionId: 'another-session' },
  { toolName: 'different-tool' },
  { input: undefined },
  { input: { ...captured, text: '{"path":"other.csv"}' } },
  { input: { ...captured, source: 'different-input-source' } },
  { input: { ...captured, truncated: true } },
  { input: { ...captured, redacted: true } },
])('rejects a changed or incomplete native Cursor binding: %o', (change) => {
  expect(findingMatchesToolEvent(finding, { ...cursorEvent, ...change })).toBe(false);
});

it.each([{ inputTruncated: true }, { inputRedacted: true }])(
  'does not relax a finding whose original input is incomplete: %o',
  (change) => {
    expect(
      findingMatchesToolEvent(
        { ...finding, invocation: { ...cursorInvocation, ...change } },
        cursorEvent
      )
    ).toBe(false);
  }
);

it('keeps legacy request-ID binding hash-strict despite identical visible inputs', () => {
  const legacy = {
    ...finding,
    invocation: {
      ...cursorInvocation,
      requestId: 'request',
      processExitCode: 0,
      correlation: 'exact_request_id' as const,
    },
  };
  expect(findingMatchesToolEvent(legacy, { ...cursorEvent, exitCode: 0 })).toBe(false);
});

it('retains the native source binding for a tool-only policy without captured input', () => {
  const empty = { ...nativeFields, input: '' };
  expect(parseSecurityInvocation({ invocation: empty }, cursorAgent, 'default')).toMatchObject({
    input: '',
    source: cursorEvent.source,
  });
  expect(
    parseSecurityInvocation(
      {
        request_id: 'request',
        invocation: {
          ...empty,
          request_id: 'request',
          correlation: 'exact_request_id',
          process_exit_code: 0,
        },
      },
      cursorAgent,
      'default'
    )
  ).toBeUndefined();
});

const tool: AgentToolCall = {
  id: 'trace-1:tool-span',
  traceId: 'trace-1',
  spanId: 'tool-span',
  invocationSpanId: 'agent-span',
  toolName: 'platform.core.execute_esql',
  toolCallId: 'agent-call',
  timestamp: '2026-10-14T12:00:00Z',
  outcome: 'success',
  nameRedacted: false,
  source: { index: '.ds-traces-agent_builder.otel-default-2026.10.14-000001', id: 'otel-document' },
};
const agent = {
  id: 'elastic-ai-agent',
  provider: 'agent_builder' as const,
  sessionId: 'trace-1:agent-span',
};
const agentFields: SecurityInvocationFields = {
  ...nativeFields,
  tool_call_id: 'agent-call',
  tool_name: tool.toolName,
  observation_index: tool.source.index,
  observation_id: tool.source.id,
  trace_id: tool.traceId,
  span_id: tool.spanId,
  invocation_span_id: tool.invocationSpanId,
};
const agentInvocation = requireInvocation(
  parseSecurityInvocation({ invocation: agentFields }, agent, 'default')
);
const agentFinding: SecurityFinding = { ...finding, agent, invocation: agentInvocation };

it('matches the exact Agent Builder backing document, invocation, span, and tool call ID', () => {
  expect(findingMatchesAgentToolCall(agentFinding, tool)).toBe(true);
});

it.each<Partial<AgentToolCall>>([
  { traceId: 'another-trace' },
  { spanId: 'another-span' },
  { invocationSpanId: 'sibling-agent-span' },
  { source: { ...tool.source, id: 'another-document' } },
  { source: { ...tool.source, index: '.ds-traces-agent_builder.otel-other-2026.10.14-000001' } },
  { toolCallId: 'different-call' },
  { toolName: 'different-tool' },
])('rejects a nearby or partially matching Agent Builder tool call: %o', (change) => {
  expect(findingMatchesAgentToolCall(agentFinding, { ...tool, ...change })).toBe(false);
});

it('supports an absent Agent Builder call ID only via the explicit span fallback', () => {
  const spanFallback = {
    ...agentFinding,
    invocation: { ...agentInvocation, toolCallId: tool.spanId },
  };
  expect(findingMatchesAgentToolCall(spanFallback, { ...tool, toolCallId: undefined })).toBe(true);
  expect(findingMatchesAgentToolCall(agentFinding, { ...tool, toolCallId: undefined })).toBe(false);
});

it.each<Partial<SecurityInvocationFields>>([
  { trace_id: undefined },
  { span_id: undefined },
  { invocation_span_id: 'other-invocation' },
  { observation_index: '.ds-traces-agent_builder.otel-finance-2026.10.14-000001' },
  { observation_index: '.ds-traces-agent_builderXotel-default-2026.10.14-000001' },
])('rejects inconsistent or cross-space Agent Builder evidence: %o', (change) => {
  expect(
    parseSecurityInvocation({ invocation: { ...agentFields, ...change } }, agent, 'default')
  ).toBeUndefined();
});
