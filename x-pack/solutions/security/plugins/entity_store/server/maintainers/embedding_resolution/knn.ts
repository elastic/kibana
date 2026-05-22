/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getFieldValue } from '../../../common/domain/euid/commons';
import { ENGINE_METADATA_TYPE_FIELD } from '../../domain/logs_extraction/query_builder_commons';
import { DEFAULT_EMBEDDING_FIELD, type IdentityFields } from './embed';
import { USER_IDENTITY_SOURCE_FIELDS, extractUserIdentity } from './identity_fields';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/**
 * One kNN neighbor of a source entity.
 *
 * - candidateId: `entity.id` of the neighbor.
 * - score: cosine similarity returned by `_score`. Phase 3 thresholds against
 *   this directly; Phase 4 may rerank to override it.
 * - resolvedTo: `entity.relationships.resolution.resolved_to` of the neighbor
 *   if that neighbor is itself an alias, else `null`. The caller (apply-links
 *   step) uses this to branch between "extend existing group" (when set) vs
 *   "create new pair" (when null) — same shape as the rules engine
 *   `automated_resolution/run.ts:297–306`.
 * - identity: identity fields surfaced for the apply-links step's role-account
 *   defence-in-depth check (design §11 E9). Always present, may be empty.
 */
export interface KnnCandidate {
  candidateId: string;
  score: number;
  resolvedTo: string | null;
  identity: IdentityFields;
}

/**
 * Runs a kNN search over `entity.resolution.embedding` for one source entity.
 * Mirrors the body shape from `er-v2-embedding-resolution-howto.md` §6 with
 * two safety filters baked in:
 *
 * - `entity.EngineMetadata.Type === entityType` (don't match a user against
 *   a host that happens to live in the same vector space).
 * - exclude self by `entity.id` (kNN returns the source as its own top hit
 *   with score 1.0 otherwise).
 *
 * NOT filtered out:
 *
 * - candidates that are themselves aliases (`resolved_to` set). The Phase 3
 *   apply-links step needs to see them so it can extend the existing group
 *   (design §7 final paragraph) instead of creating a parallel one.
 * - candidates without an embedding. kNN naturally only returns docs that
 *   have a value at `field`, so explicit filtering would be redundant.
 *
 * Post-filters by `minSimilarity` so the run loop only ever considers
 * candidates above its threshold (default 0.85 per design §9).
 */
export async function collectKnnCandidates({
  esClient,
  index,
  entityId,
  queryVector,
  entityType,
  field = DEFAULT_EMBEDDING_FIELD,
  k,
  numCandidates,
  minSimilarity,
}: {
  esClient: ElasticsearchClient;
  index: string;
  entityId: string;
  queryVector: number[];
  entityType: string;
  /** ES field path for the dense_vector. Defaults to {@link DEFAULT_EMBEDDING_FIELD}. */
  field?: string;
  k: number;
  numCandidates: number;
  minSimilarity: number;
}): Promise<KnnCandidate[]> {
  if (queryVector.length === 0) {
    return [];
  }

  const response = await esClient.search({
    index,
    size: k,
    knn: {
      field,
      query_vector: queryVector,
      k,
      num_candidates: numCandidates,
      filter: [
        { term: { [ENGINE_METADATA_TYPE_FIELD]: entityType } },
        { bool: { must_not: { term: { [ENTITY_ID_FIELD]: entityId } } } },
      ],
    },
    _source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD, ...USER_IDENTITY_SOURCE_FIELDS],
  });

  const hits = response.hits?.hits ?? [];
  const candidates: KnnCandidate[] = [];

  for (const hit of hits) {
    const score = typeof hit._score === 'number' ? hit._score : 0;
    if (score < minSimilarity) continue;

    const source = hit._source as Record<string, unknown> | undefined;
    if (!source) continue;
    const candidateId = getFieldValue(source, ENTITY_ID_FIELD);
    if (!candidateId) continue;
    const resolvedTo = getFieldValue(source, RESOLVED_TO_FIELD) ?? null;
    const identity: IdentityFields = extractUserIdentity(source);

    candidates.push({ candidateId, score, resolvedTo, identity });
  }

  return candidates;
}
