/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedEntity } from './types';

export const formatRelatedEntity = (related: RelatedEntity): string => {
  const details = [
    related.criticality ? `criticality: ${related.criticality}` : undefined,
    related.riskLevel ? `risk: ${related.riskLevel}` : undefined,
    related.interactedWithAtLeast !== undefined && related.interactedWithAtLeast > 1
      ? `interacted with: at least ${related.interactedWithAtLeast} entities`
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return `${related.kinds.join(', ')} ${related.type} "${related.name}"${
    details ? ` (${details})` : ''
  }`;
};

/**
 * `relatedEntityCounts` holds the pre-cap count per kind, so more entities
 * can exist for a kind than made it into the capped `topRelatedEntities`
 * list. Summarizes what's omitted per kind, comma-separated (e.g.
 * `"17 more accesses_frequently relationships, 3 more communicates_with relationships"`).
 */
export const formatOmittedRelatedEntityCounts = (
  topRelatedEntities: ReadonlyArray<Pick<RelatedEntity, 'kinds'>>,
  relatedEntityCounts: Readonly<Record<string, number>>
): string => {
  const shownByKind = new Map<string, number>();
  for (const entity of topRelatedEntities) {
    for (const kind of entity.kinds) {
      shownByKind.set(kind, (shownByKind.get(kind) ?? 0) + 1);
    }
  }

  const omittedByKind = Object.entries(relatedEntityCounts)
    .map(([kind, total]) => ({ kind, omitted: total - (shownByKind.get(kind) ?? 0) }))
    .filter(({ omitted }) => omitted > 0);

  if (omittedByKind.length === 0) return '';
  return omittedByKind
    .map(({ kind, omitted }) => `${omitted} more ${kind} relationships`)
    .join(', ');
};
