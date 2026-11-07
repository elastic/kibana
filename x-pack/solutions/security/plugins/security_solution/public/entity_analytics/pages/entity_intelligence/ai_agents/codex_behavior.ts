/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeAgentBehavior } from './behavior';
import { selectCodexBaseline } from './codex_model';
import type { AgentBehaviorAnalysis, BehaviorUnit } from './behavior_types';
import type { CodexSession, CodexToolEvent } from './codex_types';

const toUnit = (
  session: CodexSession,
  events: CodexToolEvent[] = [],
  callsComplete = false
): BehaviorUnit => ({
  id: session.id,
  agentId: session.agentId,
  startedAt: session.start,
  observedThrough: session.lastSeen,
  toolsComplete: session.summaryComplete,
  toolCallsComplete: callsComplete,
  source: session.source,
  toolCalls: events
    .filter((event) => event.agentId === session.agentId && event.sessionId === session.id)
    .map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      toolName: event.toolName,
      outcome: event.outcome,
      source: event.source,
    })),
  toolSummary: {
    tools: session.tools.map((tool) => ({
      toolName: tool.name,
      count: tool.count,
      successCount: tool.success_count,
      failureCount: tool.failure_count,
      unknownCount: tool.unknown_count,
    })),
  },
});

export const analyzeCodexSession = (
  session: CodexSession,
  baseline: CodexSession[],
  events: CodexToolEvent[],
  callsComplete: boolean
): AgentBehaviorAnalysis => {
  const start = Date.parse(session.start);
  const prior = selectCodexBaseline(baseline, session);
  return analyzeAgentBehavior({
    agentId: session.agentId,
    unitKind: 'session',
    baseline: {
      start: new Date(
        prior.length ? Math.min(...prior.map((item) => Date.parse(item.start))) : start - 1
      ).toISOString(),
      end: session.start,
      coverage: prior.every((item) => item.summaryComplete) ? 'complete' : 'partial',
      units: prior.map((item) => toUnit(item)),
    },
    current: {
      start: session.start,
      end: new Date(Math.max(start, Date.parse(session.lastSeen)) + 1).toISOString(),
      coverage: session.summaryComplete ? 'complete' : 'partial',
      units: [toUnit(session, events, callsComplete)],
    },
  });
};
