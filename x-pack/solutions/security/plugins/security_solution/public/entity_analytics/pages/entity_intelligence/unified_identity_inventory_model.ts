/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { AgentInventoryItem } from './ai_agents/types';
import type { CodexSession } from './ai_agents/codex_types';
import { externalAgentLabel } from './ai_agents/external_agent_provider';
import type { IntelligenceEntity, RiskLevel } from './common';

export type IdentityKind = 'user' | 'host' | 'service' | 'generic' | 'ai_agent';
export type IdentitySource =
  | 'entity_store'
  | 'agent_builder'
  | 'codex'
  | 'cursor'
  | 'claude_desktop'
  | 'google_adk';

export interface UnifiedIdentityRow {
  id: string;
  name: string;
  kind: IdentityKind;
  source: IdentitySource;
  sourceDetail?: string;
  identifier: string;
  owner?: string;
  lastSeen?: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  activity?: {
    count: number;
    unit: 'invocations' | 'sessions' | 'connections' | 'runs';
    partial: boolean;
  };
  target:
    | { source: 'entity_store'; entity: IntelligenceEntity }
    | { source: 'agent_builder'; agentId: string }
    | { source: 'codex' | 'cursor' | 'claude_desktop' | 'google_adk'; sessionKey: string };
}

interface UnifiedInventorySources {
  entities: readonly IntelligenceEntity[];
  agents: readonly AgentInventoryItem[];
  codexSessions: readonly CodexSession[];
  codexPartial?: boolean;
  cursorSessions?: readonly CodexSession[];
  cursorPartial?: boolean;
  claudeDesktopSessions?: readonly CodexSession[];
  claudeDesktopPartial?: boolean;
  googleAdkSessions?: readonly CodexSession[];
  googleAdkPartial?: boolean;
  agentActivityPartial?: boolean;
  agentActivityUnavailable?: boolean;
}

const timestamp = (value?: string): number => {
  const parsed = value ? Date.parse(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Combines source identities without treating names as unique keys or assigning agent risk. */
export const buildUnifiedIdentityRows = ({
  entities,
  agents,
  codexSessions,
  codexPartial = false,
  cursorSessions = [],
  cursorPartial = false,
  claudeDesktopSessions = [],
  claudeDesktopPartial = false,
  googleAdkSessions = [],
  googleAdkPartial = false,
  agentActivityPartial = false,
  agentActivityUnavailable = false,
}: UnifiedInventorySources): UnifiedIdentityRow[] => {
  const rows: UnifiedIdentityRow[] = entities.map((entity) => ({
    id: JSON.stringify(['entity_store', entity.type, entity.id]),
    name: entity.name,
    kind:
      entity.type === EntityType.user ||
      entity.type === EntityType.host ||
      entity.type === EntityType.service
        ? entity.type
        : 'generic',
    source: 'entity_store',
    sourceDetail: entity.source,
    identifier: entity.id,
    lastSeen: entity.lastSeen,
    riskScore:
      entity.riskScoreNorm !== undefined && Number.isFinite(entity.riskScoreNorm)
        ? entity.riskScoreNorm
        : undefined,
    riskLevel: entity.riskLevel,
    target: { source: 'entity_store', entity },
  }));

  for (const agent of agents) {
    rows.push({
      id: JSON.stringify(['agent_builder', agent.entityId]),
      name: agent.name,
      kind: 'ai_agent',
      source: 'agent_builder',
      identifier: agent.entityId,
      owner: agent.owner?.name,
      lastSeen: agent.activity?.lastSeen,
      activity:
        agent.activity && !agentActivityUnavailable
          ? {
              count: agent.activity.invocations,
              unit: 'invocations',
              partial: agentActivityPartial,
            }
          : undefined,
      target: { source: 'agent_builder', agentId: agent.id },
    });
  }

  const externalSources = [
    { provider: 'codex' as const, sessions: codexSessions, partial: codexPartial },
    { provider: 'cursor' as const, sessions: cursorSessions, partial: cursorPartial },
    {
      provider: 'claude_desktop' as const,
      sessions: claudeDesktopSessions,
      partial: claudeDesktopPartial,
    },
    {
      provider: 'google_adk' as const,
      sessions: googleAdkSessions,
      partial: googleAdkPartial,
    },
  ];
  for (const source of externalSources) {
    const installations = new Map<string, Map<string, CodexSession>>();
    for (const session of source.sessions) {
      const sessions = installations.get(session.agentId) ?? new Map<string, CodexSession>();
      const previous = sessions.get(session.id);
      if (!previous || timestamp(session.lastSeen) > timestamp(previous.lastSeen)) {
        sessions.set(session.id, session);
      }
      installations.set(session.agentId, sessions);
    }
    for (const [agentId, sessions] of installations) {
      const ordered = [...sessions.values()].sort(
        (left, right) => timestamp(right.lastSeen) - timestamp(left.lastSeen)
      );
      const latest = ordered[0];
      if (latest) {
        const investigationSession =
          ordered.find((session) => session.role === 'user') ??
          ordered.find((session) => session.role !== 'guardian_review') ??
          latest;
        rows.push({
          id: JSON.stringify([source.provider, agentId]),
          name: externalAgentLabel(source.provider),
          kind: 'ai_agent',
          source: source.provider,
          identifier: agentId,
          owner:
            source.provider === 'google_adk' ? latest.googleAdk?.owner?.email : latest.owner?.name,
          sourceDetail:
            source.provider === 'google_adk'
              ? latest.googleAdk?.service_name
              : agentId.length > 18
              ? `${agentId.slice(0, 8)}…${agentId.slice(-6)}`
              : agentId,
          lastSeen: latest.lastSeen,
          activity: {
            count: sessions.size,
            unit:
              source.provider === 'claude_desktop'
                ? 'connections'
                : source.provider === 'google_adk'
                ? 'runs'
                : 'sessions',
            partial: source.partial,
          },
          target: {
            source: source.provider,
            sessionKey: JSON.stringify([agentId, investigationSession.id]),
          },
        });
      }
    }
  }

  return rows.sort(
    (left, right) =>
      timestamp(right.lastSeen) - timestamp(left.lastSeen) ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id)
  );
};

/** Filters the loaded inventory across identity, type, and source fields. */
export const filterUnifiedIdentityRows = (
  rows: readonly UnifiedIdentityRow[],
  query: string,
  kind: IdentityKind | 'all'
): UnifiedIdentityRow[] => {
  const search = query.trim().toLocaleLowerCase();
  return rows.filter(
    (row) =>
      (kind === 'all' || row.kind === kind) &&
      (!search ||
        [
          row.name,
          row.identifier,
          row.owner,
          row.kind,
          row.source.replaceAll('_', ' '),
          row.sourceDetail,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(search))
  );
};
