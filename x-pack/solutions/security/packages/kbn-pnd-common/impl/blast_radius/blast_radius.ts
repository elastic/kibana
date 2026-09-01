/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation, ConversationEntity } from '../schemas/components/investigation.gen';

export interface BlastRadiusEntry {
  /** Stable dedup key — same value as ConversationEntity.id */
  key: string;
  /** Representative entity (first occurrence) — used for display */
  entity: ConversationEntity;
  /** Σ pendingProposalCount over all contributing conversations */
  pendingProposalCount: number;
  /** IDs of conversations that contributed — enables click-to-filter follow-up */
  conversationIds: string[];
}

/**
 * Aggregates blast-radius chips from a list of investigations.
 *
 * Only conversations with pendingProposalCount > 0 contribute — blast radius is
 * "entities on queued conversations that have a pending proposal."
 *
 * Sort: pendingProposalCount desc, then name asc (deterministic and matches the mockup).
 * Caller is responsible for pre-filtering to queue statuses if needed.
 */
export const aggregateBlastRadius = (investigations: Investigation[]): BlastRadiusEntry[] => {
  const map = new Map<string, BlastRadiusEntry>();

  for (const inv of investigations) {
    if ((inv.pendingProposalCount ?? 0) <= 0) continue;
    if (!inv.entities?.length) continue;

    for (const entity of inv.entities) {
      const existing = map.get(entity.id);
      if (existing) {
        existing.pendingProposalCount += inv.pendingProposalCount;
        existing.conversationIds.push(inv.id);
      } else {
        map.set(entity.id, {
          key: entity.id,
          entity,
          pendingProposalCount: inv.pendingProposalCount,
          conversationIds: [inv.id],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const countDiff = b.pendingProposalCount - a.pendingProposalCount;
    return countDiff !== 0 ? countDiff : a.entity.name.localeCompare(b.entity.name);
  });
};
