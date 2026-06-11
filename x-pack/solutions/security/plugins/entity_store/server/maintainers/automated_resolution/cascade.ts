/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getFieldValue } from '../../../common/domain/euid/commons';
import {
  searchEntitiesByIds,
  searchByResolvedToField,
  bulkUpdateEntityDocs,
} from '../../infra/elasticsearch/resolution';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const MAX_CASCADE_DEPTH = 50;
const MAX_CASCADE_SEARCH_SIZE = 10_000;

export interface CascadeLinkResult {
  resolutionsCreated: number;
  /**
   * Number of entities re-pointed as a cascade side-effect (an alias of an
   * alias-to-be was also retargeted).  Reported in telemetry as cascade.count.
   */
  cascadeCount: number;
  /**
   * Whether a cycle was detected and the link was rejected. Reported as
   * telemetry cascade.cycle_blocked.
   */
  cycleBlocked: boolean;
}

/**
 * Link `aliasIds` to `targetId`, with cascade-retarget for any entity that
 * currently has incoming aliases pointing to it (one-hop only — POC-1 decision a).
 *
 * Design:
 * 1. Fetch cascade candidates — entities whose `resolved_to` points to one of
 *    the `aliasIds` (they would become orphaned or form a chain otherwise).
 * 2. Fetch ES `_id` for direct aliases (needed for bulk update).
 * 3. Cycle detection — reject if target transitively references any alias.
 * 4. Depth cap — reject if total write count > MAX_CASCADE_DEPTH.
 * 5. Bulk update all in one shot.
 *
 * The cascade bypasses `ResolutionClient.linkEntities()` intentionally — that
 * client throws `EntityHasAliasesError` when an entity being aliased still has
 * incoming pointers.  Here we handle the re-pointing ourselves.
 */
export async function cascadeLink(
  esClient: ElasticsearchClient,
  index: string,
  targetId: string,
  aliasIds: string[],
  logger: Logger
): Promise<CascadeLinkResult> {
  if (aliasIds.length === 0) {
    return { resolutionsCreated: 0, cascadeCount: 0, cycleBlocked: false };
  }

  // Step A: find entities currently aliased to any of our aliasIds (cascade candidates)
  const cascadeCandidateResponse = await searchByResolvedToField(esClient, {
    index,
    resolvedToField: RESOLVED_TO_FIELD,
    targetIds: aliasIds,
    maxSize: MAX_CASCADE_SEARCH_SIZE,
    source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
  });

  // Map: aliasId → [cascadedId, ...]
  const cascadeMap = new Map<string, string[]>();
  const cascadeDocIds = new Map<string, string>();

  for (const hit of cascadeCandidateResponse.hits.hits) {
    const source = hit._source as Record<string, unknown>;
    const entityId = getFieldValue(source, ENTITY_ID_FIELD);
    const resolvedTo = getFieldValue(source, RESOLVED_TO_FIELD);
    if (!entityId || !resolvedTo) continue;

    const existing = cascadeMap.get(resolvedTo) ?? [];
    existing.push(entityId);
    cascadeMap.set(resolvedTo, existing);

    if (hit._id) {
      cascadeDocIds.set(entityId, hit._id);
    }
  }

  const allCascadedIds = [...cascadeMap.values()].flat();

  // Step B: fetch direct alias _ids (not in cascade search, need separate fetch)
  const directAliasResponse = await searchEntitiesByIds(esClient, {
    index,
    entityIdField: ENTITY_ID_FIELD,
    entityIds: aliasIds,
    source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
  });

  const directAliasDocIds = new Map<string, string>();
  const directAliasResolvedTo = new Map<string, string | null>();

  for (const hit of directAliasResponse.hits.hits) {
    const source = hit._source as Record<string, unknown>;
    const entityId = getFieldValue(source, ENTITY_ID_FIELD);
    const resolvedTo = getFieldValue(source, RESOLVED_TO_FIELD);
    if (!entityId) continue;
    if (hit._id) directAliasDocIds.set(entityId, hit._id);
    directAliasResolvedTo.set(entityId, resolvedTo ?? null);
  }

  // Step C: cycle detection — reject if targetId appears as a value in any chain
  if (wouldCreateCycle(targetId, aliasIds, allCascadedIds, directAliasResolvedTo)) {
    logger.warn(
      `Cascade cycle detected: linking ${aliasIds.join(', ')} → ${targetId} would create a cycle`
    );
    return { resolutionsCreated: 0, cascadeCount: 0, cycleBlocked: true };
  }

  // Step D: depth cap
  const totalWrites = aliasIds.length + allCascadedIds.length;
  if (totalWrites > MAX_CASCADE_DEPTH) {
    logger.warn(
      `Cascade depth limit exceeded: ${totalWrites} writes > ${MAX_CASCADE_DEPTH} for target ${targetId}`
    );
    return { resolutionsCreated: 0, cascadeCount: 0, cycleBlocked: false };
  }

  // Step E: build write batch
  const updates: Array<{ docId: string; doc: Record<string, unknown> }> = [];

  for (const aliasId of aliasIds) {
    const docId = directAliasDocIds.get(aliasId);
    const existingResolvedTo = directAliasResolvedTo.get(aliasId);
    if (!docId) {
      logger.warn(`No ES _id for entity ${aliasId}, skipping in cascade batch`);
      continue;
    }
    if (existingResolvedTo === targetId) {
      continue; // already linked — idempotent skip
    }
    updates.push({ docId, doc: { [RESOLVED_TO_FIELD]: targetId } });
  }

  for (const cascadedId of allCascadedIds) {
    const docId = cascadeDocIds.get(cascadedId);
    if (!docId) {
      logger.warn(`No ES _id for cascade entity ${cascadedId}, skipping`);
      continue;
    }
    updates.push({ docId, doc: { [RESOLVED_TO_FIELD]: targetId } });
  }

  if (updates.length === 0) {
    return { resolutionsCreated: 0, cascadeCount: 0, cycleBlocked: false };
  }

  logger.debug(
    `Cascade link: ${updates.length} writes (${aliasIds.length} direct + ${allCascadedIds.length} cascaded) → ${targetId}`
  );

  await bulkUpdateEntityDocs(esClient, { index, updates, refresh: false });

  const directLinked = updates.filter((u) =>
    aliasIds.some((id) => directAliasDocIds.get(id) === u.docId)
  ).length;

  return {
    resolutionsCreated: directLinked,
    cascadeCount: updates.length - directLinked,
    cycleBlocked: false,
  };
}

function wouldCreateCycle(
  targetId: string,
  directAliasIds: string[],
  cascadedIds: string[],
  directAliasResolvedTo: Map<string, string | null>
): boolean {
  // A cycle would form if targetId is reachable from itself by following
  // the alias chain being created.  Simple check: is targetId among the
  // entities being aliased?
  const allAliasIds = new Set([...directAliasIds, ...cascadedIds]);
  if (allAliasIds.has(targetId)) {
    return true;
  }

  // Also check: does any direct alias currently point to something that would
  // eventually loop back to targetId?  One-hop check only (per POC-1 decision a).
  for (const [aliasId, resolvedTo] of directAliasResolvedTo.entries()) {
    if (resolvedTo === targetId && directAliasIds.includes(aliasId)) {
      // alias already points to target — idempotent, not a cycle
      continue;
    }
    if (resolvedTo && allAliasIds.has(resolvedTo)) {
      // alias would create: alias → resolvedTo → ... which involves a member
      // of the alias set — potential loop, reject conservatively
      return true;
    }
  }

  return false;
}
