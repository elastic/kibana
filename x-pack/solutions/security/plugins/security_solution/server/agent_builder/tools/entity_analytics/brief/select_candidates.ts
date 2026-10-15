/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type {
  BriefTileId,
  EntityAnalyticsScope,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import { BRIEF_TILE_IDS } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './brief_types';
import { MAX_BRIEF_CANDIDATES } from './brief_types';
import { getRankRisk } from './build_facts';

const getTileOrder = (focusTileId: BriefTileId | undefined): BriefTileId[] =>
  orderBy(BRIEF_TILE_IDS, (tileId) => tileId === focusTileId, 'desc');

/** Maps each entity id in the scope's available tiles to its tile ids, the selected tile first. */
export const selectCandidateTiles = (scope: EntityAnalyticsScope): Map<string, BriefTileId[]> => {
  const { focusTileId, tiles } = scope;
  const tileIdsByEntityId = new Map<string, BriefTileId[]>();
  for (const tileId of getTileOrder(focusTileId)) {
    const tile = tiles[tileId];
    const entityIds = tile && !tile.unavailable ? tile.entityIds : [];
    for (const entityId of entityIds) {
      tileIdsByEntityId.set(entityId, [...(tileIdsByEntityId.get(entityId) ?? []), tileId]);
    }
  }
  return tileIdsByEntityId;
};

/** The ranking key before risk: selected tile membership, then tile count. Elasticsearch sorts on it too. */
export const getRankWeight = (
  tileIds: readonly BriefTileId[],
  focusTileId: BriefTileId | undefined
): number => (focusTileId !== undefined && tileIds.includes(focusTileId) ? 10 : 0) + tileIds.length;

/** Folds aliases into their golden entity, using its own record when read, otherwise the first alias's. */
export const foldAliases = (
  candidates: BriefCandidate[],
  focusTileId: BriefTileId | undefined
): BriefCandidate[] => {
  const byIdentityId = new Map<string, BriefCandidate>();
  for (const candidate of candidates) {
    const identityId =
      candidate.record.entity?.relationships?.resolution?.resolved_to ?? candidate.id;
    const folded = byIdentityId.get(identityId);
    const tileIds = [...(folded?.tileIds ?? []), ...candidate.tileIds];
    const kept = candidate.id === identityId || !folded ? candidate : folded;
    byIdentityId.set(identityId, {
      ...kept,
      id: identityId,
      tileIds: getTileOrder(focusTileId).filter((tileId) => tileIds.includes(tileId)),
    });
  }
  return [...byIdentityId.values()];
};

/** Orders candidates by `getRankWeight`, then risk, and keeps the first `MAX_BRIEF_CANDIDATES`. */
export const rankCandidates = (
  candidates: BriefCandidate[],
  focusTileId: BriefTileId | undefined
): BriefCandidate[] =>
  orderBy(
    candidates,
    [
      ({ tileIds }) => getRankWeight(tileIds, focusTileId),
      ({ record }) => getRankRisk(record)?.score ?? -1,
    ],
    ['desc', 'desc']
  ).slice(0, MAX_BRIEF_CANDIDATES);
