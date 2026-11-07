/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsePolicyEvidence, parseSecurityInvocation } from './evidence_model';
import type {
  SecurityContextFields,
  SecurityControlFields,
  SecurityFinding,
  SecurityInvocationFields,
} from './types';

const agent: SecurityFinding['agent'] = {
  id: 'installation-1',
  provider: 'codex',
  sessionId: 'session-1',
};
const invocation: SecurityInvocationFields = {
  request_id: 'request-1',
  tool_call_id: 'call-1',
  tool_name: 'exec_command',
  turn_id: 'turn-1',
  observation_index: 'logs-codex.entity_intelligence-default',
  observation_id: 'document-1',
  input_record_hash: 'a'.repeat(64),
  input_source: 'item_completed.CommandExecution.command',
  correlation: 'exact_request_id',
  input: '["node", "gateway.ts", "--request-id", "request-1"]',
  input_redacted: false,
  input_truncated: false,
  process_exit_code: 77,
};
const context = (changes: Partial<SecurityInvocationFields> = {}): SecurityContextFields => ({
  schema_version: 1,
  request_id: 'request-1',
  invocation: { ...invocation, ...changes },
});

it('retains exact recorded tool evidence without converting the process exit code into a policy outcome', () => {
  expect(parseSecurityInvocation(context(), agent, 'default')).toEqual({
    requestId: 'request-1',
    toolCallId: 'call-1',
    toolName: 'exec_command',
    turnId: 'turn-1',
    source: { index: 'logs-codex.entity_intelligence-default', id: 'document-1' },
    inputRecordHash: 'a'.repeat(64),
    inputSource: 'item_completed.CommandExecution.command',
    correlation: 'exact_request_id',
    input: invocation.input,
    inputRedacted: false,
    inputTruncated: false,
    processExitCode: 77,
  });
});

it.each<Partial<SecurityInvocationFields>>([
  { request_id: ['request-1', 'request-2'] },
  { request_id: 'different-request' },
  { tool_call_id: ['call-1'] },
  { observation_id: undefined },
  { observation_index: 'logs-codex.entity_intelligence-finance' },
  { observation_index: 'logs-cursor.entity_intelligence-default' },
  { correlation: 'nearest_timestamp' },
  { input_record_hash: 'truncated' },
  { turn_id: ['turn-1', 'turn-2'] },
  { tool_call_id: 'call-1'.repeat(60) },
  { input: 'x'.repeat(8001) },
  { input_redacted: 'false' },
  { input_truncated: undefined },
  { process_exit_code: -1 },
  { process_exit_code: 256 },
  { process_exit_code: 0.5 },
  { process_exit_code: '77' },
])('rejects incomplete, ambiguous or mismatched invocation evidence: %p', (changes) => {
  expect(parseSecurityInvocation(context(changes), agent, 'default')).toBeUndefined();
});

it('does not turn a bare session identifier or missing agent identity into a tool association', () => {
  expect(parseSecurityInvocation({ schema_version: 1 }, agent, 'default')).toBeUndefined();
  expect(parseSecurityInvocation(context(), undefined, 'default')).toBeUndefined();
  expect(
    parseSecurityInvocation(context(), { id: 'installation-1', provider: 'codex' }, 'default')
  ).toBeUndefined();
  expect(
    parseSecurityInvocation({ ...context(), request_id: undefined }, agent, 'default')
  ).toBeUndefined();
});

it('supports an exact provider-scoped Cursor observation and optional turn ID', () => {
  expect(
    parseSecurityInvocation(
      context({ observation_index: 'logs-cursor.entity_intelligence-default', turn_id: undefined }),
      { id: 'cursor-installation', provider: 'cursor', sessionId: 'session-1' },
      'default'
    )
  ).toMatchObject({
    source: { index: 'logs-cursor.entity_intelligence-default' },
    turnId: undefined,
  });
});

const clause = {
  id: 'deny-protected-read',
  name: 'Protect confidential files',
  condition: 'operation=read AND resource=protected',
  expected: 'deny' as const,
};
const control: SecurityControlFields = {
  version: '2',
  decision: 'deny',
  clause,
  policy_sha256: 'b'.repeat(64),
  definition: {
    description: 'Fixture boundary policy',
    scope: 'New inert fixture directory',
    clauses: [clause],
  },
};

it('retains the exact matching clause and immutable recorded policy definition', () => {
  expect(parsePolicyEvidence(control)).toEqual({
    version: '2',
    sha256: 'b'.repeat(64),
    clause,
    definition: control.definition,
  });
});

it.each<Partial<SecurityControlFields>>([
  { decision: 'allow' },
  { clause: { ...clause, condition: 'A different condition' } },
  { clause: { ...clause, expected: ['deny', 'allow'] } },
  { policy_sha256: 'bad-hash' },
  { version: ['1', '2'] },
  { definition: { ...control.definition, clauses: [clause, clause] } },
  { definition: { ...control.definition, clauses: [] } },
  {
    definition: {
      ...control.definition,
      clauses: Array.from({ length: 17 }, (_, i) => ({ ...clause, id: `clause-${i}` })),
    },
  },
])(
  'does not present a mismatched or incomplete definition as the matched policy: %p',
  (changes) => {
    const parsed = parsePolicyEvidence({ ...control, ...changes });
    expect(parsed.definition).toBeUndefined();
    expect(parsed.clause).toBeUndefined();
  }
);

it('preserves a legacy policy version without inventing a definition or matched clause', () => {
  expect(parsePolicyEvidence({ version: '1' })).toEqual({
    version: '1',
    sha256: undefined,
    clause: undefined,
  });
});

it('retains a native Cursor call without inventing a request ID or process result', () => {
  const native = context({
    correlation: 'exact_native_observation',
    request_id: undefined,
    process_exit_code: undefined,
    observation_index: 'logs-cursor.entity_intelligence-default',
  });
  expect(
    parseSecurityInvocation(native, { ...agent, provider: 'cursor' }, 'default')
  ).toMatchObject({
    correlation: 'exact_native_observation',
    toolCallId: 'call-1',
    requestId: undefined,
    processExitCode: undefined,
  });
});

const nativeAgent = {
  id: 'elastic-ai-agent',
  provider: 'agent_builder' as const,
  sessionId: 'trace1:invoke1',
};
const nativeContext = context({
  correlation: 'exact_native_observation',
  request_id: undefined,
  process_exit_code: undefined,
  tool_name: 'platform.core.execute_esql',
  observation_index: '.ds-traces-agent_builder.otel-default-2026.10.14-000001',
  observation_id: '_native-id',
  trace_id: 'trace1',
  span_id: 'tool1',
  invocation_span_id: 'invoke1',
});

it('preserves native Agent Builder span attribution and its space-specific backing index', () => {
  expect(parseSecurityInvocation(nativeContext, nativeAgent, 'default')).toMatchObject({
    correlation: 'exact_native_observation',
    traceId: 'trace1',
    spanId: 'tool1',
    invocationSpanId: 'invoke1',
  });
});

it.each([
  { observation_index: '.ds-traces-agent_builder.otel-other-2026.10.14-000001' },
  { invocation_span_id: 'different-invocation' },
  { trace_id: 'different-trace' },
  { span_id: undefined },
  { invocation_span_id: undefined },
])('rejects native Agent Builder evidence from another space or invocation: %p', (changes) => {
  expect(
    parseSecurityInvocation(
      { ...nativeContext, invocation: { ...nativeContext.invocation, ...changes } },
      nativeAgent,
      'default'
    )
  ).toBeUndefined();
});

it('binds the immutable policy snapshot to the recorded policy and revision', () => {
  const definition = { ...control.definition, policy_id: 'policy-1', policy_version: 2 };
  expect(parsePolicyEvidence({ ...control, id: 'policy-1', definition }).definition).toEqual(
    definition
  );
  expect(
    parsePolicyEvidence({ ...control, id: 'policy-2', definition }).definition
  ).toBeUndefined();
  expect(
    parsePolicyEvidence({ ...control, id: 'policy-1', version: '3', definition }).definition
  ).toBeUndefined();
});
