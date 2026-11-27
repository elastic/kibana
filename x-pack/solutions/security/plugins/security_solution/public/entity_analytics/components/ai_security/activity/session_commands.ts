/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOwnRootResolver } from '../../../../../common/entity_analytics/ai_security/activity/session_rules';
import { mergeProcessEvents } from '../../../../../common/entity_analytics/ai_security/activity/process_records';
import { isSetupProcess } from './build_agent_activity';
import type { AgentSessions, ProcessRecord } from './types';

/** Wrappers the agent runs every command through. They say nothing about what it did. */
const WRAPPER_NAMES: ReadonlySet<string> = new Set([
  'bash',
  'sh',
  'zsh',
  'dash',
  'fish',
  'node',
  'claude',
  'cursor-agent',
  'cmd.exe',
  'powershell.exe',
  'pwsh',
  'pwsh.exe',
]);

export interface SessionCommands {
  /** Commands the session ran, setup and shell wrappers left out. */
  readonly count: number;
  /** Distinct command names, most used first. */
  readonly names: readonly string[];
}

/**
 * What each session ran, for its row in the list: commands placed under a session by ancestry,
 * without the agent's setup and its subtrees, or the shells that wrap each command. Expects the
 * rows of `buildSessionCommandsQuery`, which already leaves setup out.
 */
export const summariseSessionCommands = (
  { sessions, ownEvents }: Pick<AgentSessions, 'sessions' | 'ownEvents'>,
  descendantEvents: readonly ProcessRecord[]
): Map<string, SessionCommands> => {
  const own = mergeProcessEvents(ownEvents);
  const rootOf = getOwnRootResolver(own);
  const sessionIds = new Set(sessions.map(({ id }) => id));
  const sessionFor = ({ parentEntityId, ancestry }: ProcessRecord): string | undefined => {
    const ownAncestor = [parentEntityId, ...ancestry].find((id) => !!id && own.has(id));
    const root = ownAncestor && rootOf(ownAncestor);
    return root && sessionIds.has(root) ? root : undefined;
  };

  // The query leaves most setup out, so a command whose parent is neither the agent nor a kept
  // command is in a setup subtree. Setup that reaches here is checked again.
  const kept = new Set<string>();
  const namesBySession = new Map<string, Map<string, number>>();
  const processes = [...mergeProcessEvents(descendantEvents).values()].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  for (const process of processes) {
    const parent = process.parentEntityId;
    if (parent && (own.has(parent) || kept.has(parent)) && !isSetupProcess(process)) {
      kept.add(process.entityId);
      const sessionId = sessionFor(process);
      if (sessionId && process.name && !WRAPPER_NAMES.has(process.name.toLowerCase())) {
        const counts = namesBySession.get(sessionId) ?? new Map<string, number>();
        counts.set(process.name, (counts.get(process.name) ?? 0) + 1);
        namesBySession.set(sessionId, counts);
      }
    }
  }

  return new Map(
    [...namesBySession.entries()].map(([sessionId, counts]) => [
      sessionId,
      {
        count: [...counts.values()].reduce((sum, value) => sum + value, 0),
        names: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name),
      },
    ])
  );
};
