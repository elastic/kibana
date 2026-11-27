/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiAgentContext } from '@kbn/entity-store/common/domain/definitions/ai_agent_context';
import { CriticalityLevels } from '../../../../../common/entity_analytics/asset_criticality/constants';

/** The parts of an `ai_agent` row the context is computed from. */
export interface AgentContextRow {
  id: string;
  /** `entity.relationships.acts_on_behalf_of.ids` */
  personIds: readonly string[];
  /** `entity.relationships.acts_on_behalf_of.raw_identifiers.user.email` */
  personEmails: readonly string[];
  /** `entity.relationships.depends_on.ids` */
  hostIds: readonly string[];
}

/** The parts of a related user or host row the context reads. */
export interface RelatedContextRow {
  id: string;
  resolvedTo?: string;
  watchlists: readonly string[];
  criticality?: string;
  mfaEnabled?: boolean;
}

const CRITICALITY_RANK: Readonly<Record<string, number>> = {
  [CriticalityLevels.LOW_IMPACT]: 1,
  [CriticalityLevels.MEDIUM_IMPACT]: 2,
  [CriticalityLevels.HIGH_IMPACT]: 3,
  [CriticalityLevels.EXTREME_IMPACT]: 4,
};

const highestCriticality = (rows: readonly RelatedContextRow[]): string | null =>
  rows.reduce<string | null>((highest, { criticality }) => {
    if (criticality === undefined || CRITICALITY_RANK[criticality] === undefined) {
      return highest;
    }
    if (highest === null || CRITICALITY_RANK[criticality] > CRITICALITY_RANK[highest]) {
      return criticality;
    }
    return highest;
  }, null);

const combineMfa = (rows: readonly RelatedContextRow[]): boolean | null => {
  const known = rows.flatMap(({ mfaEnabled }) => (mfaEnabled === undefined ? [] : [mfaEnabled]));
  if (known.length === 0) {
    return null;
  }
  return known.every(Boolean);
};

const sortedUnion = (lists: ReadonlyArray<readonly string[]>): string[] =>
  [...new Set(lists.flat())].sort();

/**
 * Resolves entity IDs to the rows of their resolution groups: the row itself, the target it is
 * resolved to, and every row resolved to that target. IDs with no row in the store resolve to
 * nothing, and their canonical ID is the ID itself.
 */
const createResolutionGroups = (relatedRows: readonly RelatedContextRow[]) => {
  const rowsById = new Map(relatedRows.map((row) => [row.id, row]));
  const membersByTarget = new Map<string, string[]>();
  for (const { id, resolvedTo } of relatedRows) {
    if (resolvedTo) {
      membersByTarget.set(resolvedTo, [...(membersByTarget.get(resolvedTo) ?? []), id]);
    }
  }

  const canonicalId = (id: string): string => rowsById.get(id)?.resolvedTo ?? id;

  const groupRows = (id: string): RelatedContextRow[] => {
    const target = canonicalId(id);
    const ids = new Set([id, target, ...(membersByTarget.get(target) ?? [])]);
    return [...ids].flatMap((groupId) => {
      const row = rowsById.get(groupId);
      return row ? [row] : [];
    });
  };

  return { rowsById, canonicalId, groupRows };
};

const uniqueRows = (rows: readonly RelatedContextRow[]): RelatedContextRow[] => [
  ...new Map(rows.map((row) => [row.id, row])).values(),
];

/**
 * Computes the context of every agent from the related user and host rows. Every key is always
 * present, `null` when its inputs are missing, so writing the result clears stale values.
 *
 * Two agents share an account when they act for the same person, after resolution, or carry the
 * same raw account email.
 */
export const computeAiAgentContexts = ({
  agents,
  relatedRows,
  now,
}: {
  agents: readonly AgentContextRow[];
  relatedRows: readonly RelatedContextRow[];
  now: string;
}): Map<string, AiAgentContext> => {
  const { rowsById, canonicalId, groupRows } = createResolutionGroups(relatedRows);

  const accountKeysByAgent = new Map(
    agents.map((agent) => [
      agent.id,
      new Set([
        ...agent.personIds.map((id) => `id:${canonicalId(id)}`),
        ...agent.personEmails.map((email) => `email:${email.toLowerCase()}`),
      ]),
    ])
  );

  const agentIdsByAccountKey = new Map<string, Set<string>>();
  for (const [agentId, keys] of accountKeysByAgent) {
    for (const key of keys) {
      agentIdsByAccountKey.set(key, (agentIdsByAccountKey.get(key) ?? new Set()).add(agentId));
    }
  }

  const countSharedInstalls = (agentId: string): number | null => {
    const keys = accountKeysByAgent.get(agentId);
    if (!keys || keys.size === 0) {
      return null;
    }
    const others = new Set<string>();
    for (const key of keys) {
      for (const otherId of agentIdsByAccountKey.get(key) ?? []) {
        if (otherId !== agentId) {
          others.add(otherId);
        }
      }
    }
    return others.size;
  };

  return new Map(
    agents.map((agent) => {
      const personRows = uniqueRows(agent.personIds.flatMap(groupRows));
      const hostRows = agent.hostIds.flatMap((id) => {
        const row = rowsById.get(id);
        return row ? [row] : [];
      });
      const personWatchlists = sortedUnion(personRows.map(({ watchlists }) => watchlists));

      const context: AiAgentContext = {
        person_watchlists: personWatchlists.length > 0 ? personWatchlists : null,
        person_criticality: highestCriticality(personRows),
        person_mfa_enabled: combineMfa(personRows),
        host_criticality: highestCriticality(hostRows),
        shared_account_installs: countSharedInstalls(agent.id),
        computed_at: now,
      };
      return [agent.id, context];
    })
  );
};
