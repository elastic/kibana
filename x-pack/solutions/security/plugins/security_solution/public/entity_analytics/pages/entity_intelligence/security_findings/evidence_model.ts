/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityPolicyClause,
  SecurityPolicyDefinition,
} from '../../../../../common/entity_intelligence/security_events';
import type {
  SecurityContextFields,
  SecurityControlFields,
  SecurityFinding,
  SecurityPolicyClauseFields,
} from './types';

const text = (value: SecurityControlFields['id'], maximum: number): string | undefined =>
  typeof value === 'string' && value.trim() && value.length <= maximum ? value : undefined;
const identifier = (value: SecurityControlFields['id']): string | undefined => {
  const candidate = text(value, 256);
  return candidate && /^[a-zA-Z0-9_-][a-zA-Z0-9_.:/-]{0,255}$/.test(candidate)
    ? candidate
    : undefined;
};
const fingerprint = (value: SecurityControlFields['id']): string | undefined =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
const parseClause = (fields?: SecurityPolicyClauseFields): SecurityPolicyClause | undefined => {
  const id = identifier(fields?.id);
  const name = text(fields?.name, 256);
  const condition = text(fields?.condition, 8192);
  const expected = fields?.expected;
  return id && name && condition && (expected === 'deny' || expected === 'allow')
    ? { id, name, condition, expected }
    : undefined;
};
const sameClause = (left: SecurityPolicyClause, right: SecurityPolicyClause): boolean =>
  left.id === right.id &&
  left.name === right.name &&
  left.condition === right.condition &&
  left.expected === right.expected;

/** Keeps a matched clause only when it agrees with the decision and recorded policy definition. */
export const parsePolicyEvidence = (
  control: SecurityControlFields
): Pick<NonNullable<SecurityFinding['policy']>, 'version' | 'clause' | 'sha256' | 'definition'> => {
  const version = identifier(control.version);
  const sha256 = fingerprint(control.policy_sha256);
  const matched = parseClause(control.clause);
  const clause = matched?.expected === control.decision ? matched : undefined;
  if (!control.definition) return { version, clause, sha256 };
  const description = text(control.definition.description, 2048);
  const scope = text(control.definition.scope, 2048);
  const policyId = identifier(control.definition.policy_id);
  const policyVersion = control.definition.policy_version;
  const validPolicyVersion =
    typeof policyVersion === 'number' && Number.isSafeInteger(policyVersion) && policyVersion > 0;
  if (
    (control.definition.policy_id !== undefined ||
      control.definition.policy_version !== undefined) &&
    (!policyId ||
      policyId !== control.id ||
      !validPolicyVersion ||
      String(policyVersion) !== version)
  )
    return { version, sha256 };
  const recorded = control.definition.clauses;
  const clauses =
    Array.isArray(recorded) && recorded.length <= 16
      ? recorded.flatMap((item) => {
          const parsed = parseClause(item);
          return parsed ? [parsed] : [];
        })
      : [];
  const definition: SecurityPolicyDefinition | undefined =
    version &&
    sha256 &&
    description &&
    scope &&
    clause &&
    clauses.length > 0 &&
    clauses.length === recorded?.length &&
    new Set(clauses.map((item) => item.id)).size === clauses.length &&
    clauses.some((item) => sameClause(item, clause))
      ? {
          description,
          scope,
          clauses,
          ...(policyId ? { policy_id: policyId, policy_version: Number(policyVersion) } : {}),
        }
      : undefined;
  return { version, sha256, clause: definition ? clause : undefined, definition };
};

/** Projects an explicit native-call binding, rejecting ambiguous identifiers and cross-space sources. */
export const parseSecurityInvocation = (
  context: SecurityContextFields | undefined,
  agent: SecurityFinding['agent'],
  spaceId: string
): SecurityFinding['invocation'] => {
  const fields = context?.invocation;
  if (!fields || !agent?.sessionId || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) return undefined;
  const requestId = identifier(fields.request_id);
  const toolCallId = identifier(fields.tool_call_id);
  const toolName = identifier(fields.tool_name);
  const turnId = identifier(fields.turn_id);
  const index = text(fields.observation_index, 256);
  const id = identifier(fields.observation_id);
  const inputRecordHash = fingerprint(fields.input_record_hash);
  const inputSource = text(fields.input_source, 256);
  const input =
    fields.correlation === 'exact_native_observation' && fields.input === ''
      ? ''
      : text(fields.input, 8000);
  const processExitCode = fields.process_exit_code;
  const native = fields.correlation === 'exact_native_observation';
  const traceId = identifier(fields.trace_id);
  const spanId = identifier(fields.span_id);
  const invocationSpanId = identifier(fields.invocation_span_id);
  const conversationId = identifier(fields.conversation_id);
  const runtimePrincipal = text(fields.runtime_principal, 320);
  const actorSource = text(fields.actor_source, 160);
  const operationOutcome = fields.operation_outcome;
  const traceIndex = `traces-agent_builder.otel-${spaceId}`;
  const validIndex =
    agent.provider === 'agent_builder'
      ? index === traceIndex ||
        Boolean(
          index &&
            new RegExp(
              `^\\.ds-${traceIndex.replace('.', '\\.')}-[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}-[0-9]{6}$`
            ).test(index)
        )
      : index === `logs-${agent.provider}.entity_intelligence-${spaceId}`;
  const validExitCode =
    typeof processExitCode === 'number' &&
    Number.isSafeInteger(processExitCode) &&
    processExitCode >= 0 &&
    processExitCode <= 255;
  if (
    (!native &&
      (fields.correlation !== 'exact_request_id' ||
        !requestId ||
        requestId !== identifier(context.request_id) ||
        agent.provider === 'agent_builder')) ||
    (native &&
      agent.provider === 'agent_builder' &&
      (!traceId ||
        !spanId ||
        !invocationSpanId ||
        agent.sessionId !== `${traceId}:${invocationSpanId}`)) ||
    !toolCallId ||
    !toolName ||
    !id ||
    !inputRecordHash ||
    !inputSource ||
    input === undefined ||
    !index ||
    !validIndex ||
    (fields.turn_id !== undefined && !turnId) ||
    typeof fields.input_redacted !== 'boolean' ||
    typeof fields.input_truncated !== 'boolean' ||
    ((!native || processExitCode !== undefined) && !validExitCode)
  )
    return undefined;
  return {
    requestId,
    ...(runtimePrincipal ? { runtimePrincipal } : {}),
    ...(actorSource ? { actorSource } : {}),
    ...(operationOutcome === 'success' ||
    operationOutcome === 'failure' ||
    operationOutcome === 'unknown'
      ? { operationOutcome }
      : {}),
    toolCallId,
    toolName,
    turnId,
    source: { index, id },
    inputRecordHash,
    inputSource,
    correlation: native ? 'exact_native_observation' : 'exact_request_id',
    ...(native ? { traceId, spanId, invocationSpanId, conversationId } : {}),
    input,
    inputRedacted: fields.input_redacted,
    inputTruncated: fields.input_truncated,
    processExitCode: validExitCode ? Number(processExitCode) : undefined,
  };
};
