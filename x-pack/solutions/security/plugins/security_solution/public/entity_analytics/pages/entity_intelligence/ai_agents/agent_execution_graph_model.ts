/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentInvocation, AgentToolCall } from './types';

export interface AgentGraphTool {
  id: string;
  name: string;
  nameRedacted: boolean;
  calls: AgentToolCall[];
  failures: number;
  successes: number;
  unknowns: number;
  x: number;
  y: number;
}

export interface AgentExecutionGraphModel {
  tools: AgentGraphTool[];
  callCount: number;
  omittedTools: number;
  width: number;
  height: number;
}

/** Groups only tools with recorded ancestry to this exact invocation; withheld names remain separate. */
export const buildAgentExecutionGraph = (
  invocation: AgentInvocation,
  toolCalls: AgentToolCall[]
): AgentExecutionGraphModel => {
  const groups = new Map<string, AgentToolCall[]>();
  const seen = new Set<string>();
  toolCalls.forEach((call) => {
    if (
      call.traceId !== invocation.traceId ||
      call.invocationSpanId !== invocation.spanId ||
      seen.has(call.id)
    )
      return;
    seen.add(call.id);
    const key = call.nameRedacted ? `withheld:${call.id}` : `tool:${call.toolName}`;
    groups.set(key, [...(groups.get(key) ?? []), call]);
  });
  const tools = [...groups]
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([id, calls], index) => ({
      id,
      name: calls[0].toolName,
      nameRedacted: calls[0].nameRedacted,
      calls: [...calls].sort(
        (left, right) =>
          right.timestamp.localeCompare(left.timestamp) || left.id.localeCompare(right.id)
      ),
      failures: calls.filter((call) => call.outcome === 'failure').length,
      successes: calls.filter((call) => call.outcome === 'success').length,
      unknowns: calls.filter((call) => call.outcome === 'unknown').length,
      x: 210 + (index % 3) * 226,
      y: 214 + Math.floor(index / 3) * 94,
    }));
  return {
    tools,
    callCount: seen.size,
    omittedTools: Math.max(0, groups.size - tools.length),
    width: 910,
    height: tools.length > 3 ? 418 : 330,
  };
};
