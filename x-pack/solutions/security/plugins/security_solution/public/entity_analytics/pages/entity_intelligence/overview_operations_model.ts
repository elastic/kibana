/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeCodexSession } from './ai_agents/codex_behavior';
import type { CodexSession } from './ai_agents/codex_types';
import type { BehaviorFinding } from './ai_agents/behavior_types';

export interface OverviewSessionSignal {
  session: CodexSession;
  findings: BehaviorFinding[];
}

export interface OverviewExternalSummary {
  installations: number;
  sessions: number;
  observations: number;
  failures: number;
  unknownOutcomes: number;
  evaluatedSessions: number;
  changedSessions: number;
  signals: OverviewSessionSignal[];
  recentSessions: CodexSession[];
}

/** Summarizes loaded snapshots; only comparable complete sessions contribute to drift findings. */
export const summarizeOverviewSessions = (
  sessions: readonly CodexSession[]
): OverviewExternalSummary => {
  const unique = new Map<string, CodexSession>();
  sessions.forEach((session) => {
    const key = JSON.stringify([session.provider ?? 'codex', session.agentId, session.id]);
    const previous = unique.get(key);
    if (
      !previous ||
      Date.parse(session.ingestedAt ?? session.lastSeen) >
        Date.parse(previous.ingestedAt ?? previous.lastSeen)
    )
      unique.set(key, session);
  });
  const snapshots = [...unique.values()].sort(
    (left, right) =>
      Date.parse(right.lastSeen) - Date.parse(left.lastSeen) || left.id.localeCompare(right.id)
  );
  const candidates = snapshots.filter((session) => session.role !== 'guardian_review');
  let evaluatedSessions = 0;
  const signals = candidates.flatMap((session): OverviewSessionSignal[] => {
    const analysis = analyzeCodexSession(session, snapshots, [], false);
    if (
      ['new_tool', 'failure_rate_increase', 'tool_volume_increase'].some(
        (kind) =>
          analysis.comparisons[
            kind as 'new_tool' | 'failure_rate_increase' | 'tool_volume_increase'
          ].status === 'evaluated'
      )
    )
      evaluatedSessions += 1;
    return analysis.findings.length ? [{ session, findings: analysis.findings }] : [];
  });
  return {
    installations: new Set(
      snapshots.map((session) => JSON.stringify([session.provider ?? 'codex', session.agentId]))
    ).size,
    sessions: snapshots.length,
    observations: snapshots.reduce((sum, session) => sum + session.toolCount, 0),
    failures: snapshots.reduce((sum, session) => sum + session.failures, 0),
    unknownOutcomes: snapshots.reduce((sum, session) => sum + session.unknowns, 0),
    evaluatedSessions,
    changedSessions: signals.length,
    signals: signals.sort(
      (left, right) =>
        Number(right.findings.some((finding) => finding.kind === 'failure_rate_increase')) -
          Number(left.findings.some((finding) => finding.kind === 'failure_rate_increase')) ||
        Date.parse(right.session.lastSeen) - Date.parse(left.session.lastSeen)
    ),
    recentSessions: candidates
      .filter((session) => session.role === 'user' || !session.parentId)
      .slice(0, 3),
  };
};
