/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFinding, SecurityFindingsResult } from '../security_findings/types';
import type { CodexToolEvent } from './codex_types';
import type { AgentToolCall } from './types';
import { createContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';

export const SECURITY_GRAPH_CARD = { width: 248, height: 122, gap: 24, rowGap: 28 } as const;
export const SECURITY_INVOCATION_CARD_HEIGHT = 254;
export const securityFindingKey = (finding: SecurityFinding): string =>
  JSON.stringify([finding.source.index, finding.source.id]);

/** Keys complete immutable invocation references without inferring a match from names or time. */
export const securityInvocationReferenceKey = (finding: SecurityFinding): string | undefined => {
  const invocation = finding.invocation;
  const identity = [
    finding.agent?.provider,
    finding.agent?.id,
    finding.agent?.sessionId,
    invocation?.source.index,
    invocation?.source.id,
    invocation?.toolCallId,
    invocation?.toolName,
    invocation?.inputRecordHash,
  ];
  return identity.every((value) => typeof value === 'string' && value.trim().length > 0)
    ? JSON.stringify(identity)
    : undefined;
};

export const readableSecurityFindings = (result?: SecurityFindingsResult): SecurityFinding[] => {
  if (!result || result.isLoading || result.isRefreshing || result.unavailable) return [];
  const unique = new Map<string, SecurityFinding>();
  result.findings.forEach((finding) => {
    const key = securityFindingKey(finding);
    if (!unique.has(key)) unique.set(key, finding);
  });
  return [...unique.values()];
};

export interface SecurityGraphNode {
  finding: SecurityFinding;
  findings: SecurityFinding[];
  event?: CodexToolEvent;
  agentCall?: AgentToolCall;
  key: string;
  number: number;
  column: number;
  row: number;
}

export interface SecurityGraphEvidence {
  events?: CodexToolEvent[];
  agentCalls?: AgentToolCall[];
}

const outcomePriority = (finding: SecurityFinding): number =>
  finding.outcome === 'blocked' ? 2 : finding.kind === 'policy_violation' ? 1 : 0;

/** Combines findings only when they match the same loaded native tool invocation. */
export const buildSecurityGraphNodes = (
  findings: SecurityFinding[],
  { events = [], agentCalls = [] }: SecurityGraphEvidence = {}
): SecurityGraphNode[] => {
  const unique = new Map<string, SecurityFinding>();
  findings.forEach((finding) => {
    const key = securityFindingKey(finding);
    if (!unique.has(key)) unique.set(key, finding);
  });
  const groups = new Map<string, Omit<SecurityGraphNode, 'number' | 'column' | 'row'>>();
  [...unique.values()]
    .sort(
      (left, right) =>
        Date.parse(left.timestamp) - Date.parse(right.timestamp) ||
        securityFindingKey(left).localeCompare(securityFindingKey(right))
    )
    .forEach((finding) => {
      const event = events.find((item) => findingMatchesToolEvent(finding, item));
      const agentCall = agentCalls.find((call) => findingMatchesAgentToolCall(finding, call));
      const key = event
        ? JSON.stringify([
            'native_tool',
            event.provider ?? 'codex',
            event.agentId,
            event.sessionId,
            event.source.index,
            event.source.id,
            event.id,
            event.recordHash,
          ])
        : agentCall
        ? JSON.stringify([
            'agent_builder_tool',
            finding.agent?.id,
            agentCall.traceId,
            agentCall.invocationSpanId,
            agentCall.spanId,
            agentCall.source.index,
            agentCall.source.id,
          ])
        : securityFindingKey(finding);
      const group = groups.get(key);
      if (!group) {
        groups.set(key, { finding, findings: [finding], key, event, agentCall });
        return;
      }
      group.findings.push(finding);
      if (outcomePriority(finding) > outcomePriority(group.finding)) group.finding = finding;
    });
  return [...groups.values()].map((group, index) => ({
    ...group,
    number: index + 1,
    column: index % 3,
    row: Math.floor(index / 3),
  }));
};

/** Matches only the indexed native invocation explicitly referenced by a security finding. */
export const findingMatchesToolEvent = (
  finding: SecurityFinding,
  event: CodexToolEvent
): boolean => {
  const invocation = finding.invocation;
  return Boolean(
    invocation &&
      finding.agent?.provider === (event.provider ?? 'codex') &&
      finding.agent.id === event.agentId &&
      finding.agent.sessionId === event.sessionId &&
      invocation.source.index === event.source.index &&
      invocation.source.id === event.source.id &&
      invocation.toolCallId === event.id &&
      invocation.toolName === event.toolName &&
      (invocation.inputRecordHash === event.recordHash ||
        (invocation.correlation === 'exact_native_observation' &&
          !invocation.inputTruncated &&
          !event.input?.truncated &&
          !invocation.inputRedacted &&
          !event.input?.redacted &&
          invocation.input === event.input?.text &&
          invocation.inputSource === event.input?.source)) &&
      (invocation.processExitCode === undefined || invocation.processExitCode === event.exitCode) &&
      (!invocation.turnId || invocation.turnId === event.turnId) &&
      (invocation.correlation === 'exact_native_observation' ||
        event.observationType === 'native_tool_completion')
  );
};

export const securityGraphHeight = (count: number, invocations = false): number =>
  count > 0
    ? Math.ceil(Math.min(count, 6) / 3) *
        ((invocations ? SECURITY_INVOCATION_CARD_HEIGHT : SECURITY_GRAPH_CARD.height) +
          SECURITY_GRAPH_CARD.rowGap) +
      70
    : 0;

/** Displays the recorded shell command without the surrounding native runtime argument envelope. */
export const securityInvocationCommand = (input: string): string => {
  const safe = createContentRedactor().redact(input, 8000).text;
  try {
    const value: string | string[] | { cmd?: string; command?: string } | null = JSON.parse(safe);
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      const commandFlag = value.findIndex((part) => part === '-c' || part === '-lc');
      return commandFlag >= 0 && value[commandFlag + 1] ? value[commandFlag + 1] : value.join(' ');
    }
    if (value && !Array.isArray(value)) {
      if (typeof value.cmd === 'string') return value.cmd;
      if (typeof value.command === 'string') return value.command;
    }
  } catch {
    return safe;
  }
  return safe;
};

/** Correlates Agent Builder findings to one exact tool span within its recorded invocation. */
export const findingMatchesAgentToolCall = (
  finding: SecurityFinding,
  call: AgentToolCall
): boolean => {
  const evidence = finding.invocation;
  return Boolean(
    evidence?.correlation === 'exact_native_observation' &&
      finding.agent?.provider === 'agent_builder' &&
      finding.agent.sessionId === `${call.traceId}:${call.invocationSpanId}` &&
      evidence.traceId === call.traceId &&
      evidence.spanId === call.spanId &&
      evidence.invocationSpanId === call.invocationSpanId &&
      evidence.source.index === call.source.index &&
      evidence.source.id === call.source.id &&
      evidence.toolCallId === (call.toolCallId ?? call.spanId) &&
      evidence.toolName === call.toolName
  );
};
