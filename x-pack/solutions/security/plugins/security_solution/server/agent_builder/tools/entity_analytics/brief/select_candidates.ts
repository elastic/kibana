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
import { getEntityRisk } from './build_facts';

/** Maps each entity id in the scope's available tiles to its tile ids, the selected tile first. */
export const selectCandidateTiles = (scope: EntityAnalyticsScope): Map<string, BriefTileId[]> => {
  const { focusTileId, tiles } = scope;
  const tileOrder = orderBy(BRIEF_TILE_IDS, (tileId) => tileId === focusTileId, 'desc');
  const tileIdsByEntityId = new Map<string, BriefTileId[]>();
  for (const tileId of tileOrder) {
    const tile = tiles[tileId];
    const entityIds = tile && !tile.unavailable ? tile.entityIds : [];
    for (const entityId of entityIds) {
      tileIdsByEntityId.set(entityId, [...(tileIdsByEntityId.get(entityId) ?? []), tileId]);
    }
  }
  return tileIdsByEntityId;
};

/** Orders candidates by selected tile membership, then tile count, then risk, and keeps the first `MAX_BRIEF_CANDIDATES`. */
export const rankCandidates = (
  candidates: BriefCandidate[],
  focusTileId: BriefTileId | undefined
): BriefCandidate[] =>
  orderBy(
    candidates,
    [
      ({ tileIds }) => focusTileId !== undefined && tileIds.includes(focusTileId),
      ({ tileIds }) => tileIds.length,
      ({ record }) => getEntityRisk(record)?.score ?? -1,
    ],
    ['desc', 'desc', 'desc']
  ).slice(0, MAX_BRIEF_CANDIDATES);
