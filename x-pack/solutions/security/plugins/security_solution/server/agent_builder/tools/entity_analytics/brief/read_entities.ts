/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { min, orderBy, truncate, uniq } from 'lodash';
import { unflattenObject } from '@kbn/object-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AssetCriticalityLevel, Entity, EntityRiskLevels } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getEntityType } from '../../../../../common/entity_analytics/entity_store/sanitize_entity_record_for_upsert';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import { fetchGroupMembers } from '../../../../lib/entity_analytics/entity_case_counts/fetch_group_member_ids';
import { resolveDisplayName } from '../../../../lib/entity_analytics/lead_generation/entity_conversion';
import { getHigherCriticality } from '../../../../lib/entity_analytics/risk_score/maintainer/steps/resolution_modifiers';
import { ENTITY_IDENTIFIER_TYPES } from '../entity_resolution';
import type { BriefCandidate, BriefEntityType } from './types';
import { MAX_BRIEF_CANDIDATES } from './types';

/** Display names come from source logs, so an attacker can choose them. */
const MAX_NAME_LENGTH = 80;

export interface CandidateEntities {
  /** Ranked and capped at `MAX_BRIEF_CANDIDATES`. */
  candidates: BriefCandidate[];
  /** Distinct entity ids in the view's tiles. */
  capturedCount: number;
  /** Entity Store records read for them. */
  readCount: number;
  isTruncated: boolean;
  notFoundCount: number;
}

/** Reads the Entity Store records of the view's flagged entities, as the user, and ranks them. */
export const readEntities = async ({
  scope,
  spaceId,
  esClient,
}: {
  scope: EntityAnalyticsScope;
  spaceId: string;
  esClient: ElasticsearchClient;
}): Promise<CandidateEntities> => {
  const tileIdsByEntityId = selectCandidateTiles(scope);
  const entityIds = [...tileIdsByEntityId.keys()];

  // Every record is read: at most 200 ids per tile, about 1 KB each. The page's search isn't applied,
  // because the tiles don't apply it either.
  const response = await esClient.search<Entity>({
    index: getEntitiesAlias(ENTITY_LATEST, spaceId),
    size: entityIds.length,
    ignore_unavailable: true,
    query: { bool: { filter: [{ terms: { 'entity.id': entityIds } }] } },
    sort: [{ 'entity.id': 'asc' }],
  });

  const candidates = response.hits.hits.flatMap(({ _source: source }): BriefCandidate[] => {
    // The Entity Store can hold fields as dotted keys, such as `entity.id`.
    const record = source && (unflattenObject(source) as Entity);
    const id = record?.entity?.id;
    const tileIds = id ? tileIdsByEntityId.get(id) : undefined;
    if (!record || !id || !tileIds) {
      return [];
    }
    const type = getBriefEntityType(record, id);
    const name = truncate(resolveDisplayName(record, type, id), { length: MAX_NAME_LENGTH });
    return [{ id, name, type, tileIds, record }];
  });

  const ranked = rankCandidates(candidates, scope.focusTileId);
  const membersById = await fetchGroupMembers(
    esClient,
    spaceId,
    ranked.map(({ id }) => id),
    MEMBER_FIELDS
  );
  return {
    candidates: ranked.map((candidate) => {
      const members = membersById[candidate.id] ?? [];
      return {
        ...withGroupValues(
          candidate,
          members.map(({ record }) => record)
        ),
        members,
      };
    }),
    capturedCount: entityIds.length,
    readCount: response.hits.hits.length,
    isTruncated: candidates.length > MAX_BRIEF_CANDIDATES,
    notFoundCount: entityIds.length - response.hits.hits.length,
  };
};

/** Maps each entity id in the view's available tiles to its tile ids. */
const selectCandidateTiles = ({ tiles }: EntityAnalyticsScope): Map<string, SignalCardId[]> => {
  const tileIdsByEntityId = new Map<string, SignalCardId[]>();
  for (const tileId of SIGNAL_CARD_IDS) {
    const tile = tiles[tileId];
    const entityIds = tile && !tile.unavailable ? tile.entityIds : [];
    for (const entityId of entityIds) {
      tileIdsByEntityId.set(entityId, [...(tileIdsByEntityId.get(entityId) ?? []), tileId]);
    }
  }
  return tileIdsByEntityId;
};

/** Every field of a member's record: its group values, and the identity fields that tell which alerts are its own. */
const MEMBER_FIELDS = ['*'];

/** A group's values, as the page shows them: the highest criticality, every watchlist, the earliest first seen. */
export const withGroupValues = (
  candidate: BriefCandidate,
  members: Entity[] = []
): BriefCandidate => {
  if (members.length === 0) {
    return candidate;
  }
  const { record } = candidate;
  const records = [record, ...members];
  return {
    ...candidate,
    record: {
      ...record,
      asset: {
        ...record.asset,
        criticality: records.reduce<AssetCriticalityLevel | null | undefined>(
          (highest, { asset }) => getHigherCriticality(highest, asset?.criticality),
          undefined
        ),
      },
      entity: {
        ...record.entity,
        attributes: {
          ...record.entity?.attributes,
          watchlists: uniq(records.flatMap(({ entity }) => entity?.attributes?.watchlists ?? [])),
        },
        lifecycle: {
          ...record.entity?.lifecycle,
          first_seen: min(records.flatMap(({ entity }) => entity?.lifecycle?.first_seen ?? [])),
        },
      },
    },
  };
};

/** Ranks by the selected tile, then how many tiles flag the entity, then risk, and keeps the first few. */
export const rankCandidates = (
  candidates: BriefCandidate[],
  focusTileId: SignalCardId | undefined
): BriefCandidate[] =>
  orderBy(
    candidates,
    [
      ({ tileIds }) => (focusTileId && tileIds.includes(focusTileId) ? 10 : 0) + tileIds.length,
      (candidate) => getCandidateRisk(candidate)?.score ?? -1,
    ],
    ['desc', 'desc']
  ).slice(0, MAX_BRIEF_CANDIDATES);

/** The risk the brief states for a candidate, and where its scores are stored. */
interface CandidateRisk {
  of: 'entity' | 'resolution group';
  score: number;
  level: EntityRiskLevels;
  scoreType: 'base' | 'resolution';
  /** The golden entity's id for a group, the record's own id otherwise. */
  scoredId: string;
}

/** Resolution first: a scored resolution group's risk, otherwise the entity's own. */
export const getCandidateRisk = ({ id, record }: BriefCandidate): CandidateRisk | undefined => {
  const group = record.entity?.relationships?.resolution?.risk;
  if (group?.calculated_score_norm !== undefined) {
    const score = group.calculated_score_norm;
    return {
      of: 'resolution group',
      score,
      level: group.calculated_level ?? getRiskLevel(score),
      scoreType: 'resolution',
      scoredId: id,
    };
  }
  const own = record.entity?.risk;
  if (own?.calculated_score_norm === undefined) {
    return undefined;
  }
  const score = own.calculated_score_norm;
  return {
    of: 'entity',
    score,
    level: own.calculated_level ?? getRiskLevel(score),
    scoreType: 'base',
    scoredId: record.entity?.id ?? id,
  };
};

/** The record's entity type, or the EUID prefix when the record has none. */
export const getBriefEntityType = (record: Entity, id: string): BriefEntityType => {
  const isKnown = (type: unknown): type is BriefEntityType =>
    ENTITY_IDENTIFIER_TYPES.some((known) => known === type);
  try {
    const type = getEntityType(record);
    if (isKnown(type)) {
      return type;
    }
  } catch {
    // A record without a type falls back to the EUID prefix.
  }
  const prefix = id.split(':')[0];
  return isKnown(prefix) ? prefix : 'generic';
};
