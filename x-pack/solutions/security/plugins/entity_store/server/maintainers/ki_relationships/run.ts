/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { getLatestEntitiesIndexName } from '../../../common';
import { bulkUpdateEntityDocs } from '../../infra/elasticsearch/resolution';
import type { KiRelationshipsLastRun } from './types';

/**
 * Stable set of relationship types the KI maintainer is allowed to write
 * to. These are exactly the keys defined under `entity.relationships` in
 * the v2 entity schema (`common/domain/definitions/entity.gen.ts`); they
 * are NOT a runtime enum from that schema because the schema imports a
 * lazy zod factory and we want a plain string union for switch coverage.
 *
 * `depends_on` is the safe default — generic enough to carry the
 * "service A reaches service B" semantic for protocols where a more
 * specific type does not apply.
 */
export type KiRelationshipType = 'depends_on' | 'communicates_with';

/**
 * Map a Streams `dependency` feature's `properties.protocol` to one of
 * the allowed relationship types. Falls back to `depends_on` for unknown
 * protocols so a new transport added upstream does not silently drop
 * relationships — operators get edges of a sensible default type until
 * the mapping is updated.
 *
 * Buckets:
 *  - "communicates_with" — symmetric in-flight message exchange
 *    (HTTP-style request/response, RPC, event bus pub/sub).
 *  - "depends_on" — runtime/data-store dependency (DB, cache, queue,
 *    auth provider, message broker subscribed to as a producer).
 */
export const protocolToRelationshipType = (protocol: string | undefined): KiRelationshipType => {
  if (!protocol) return 'depends_on';
  const lower = protocol.toLowerCase();
  if (
    lower === 'http' ||
    lower === 'https' ||
    lower === 'http2' ||
    lower === 'http/2' ||
    lower === 'grpc' ||
    lower === 'tcp' ||
    lower === 'websocket' ||
    lower === 'ws' ||
    lower === 'wss' ||
    lower === 'rpc'
  ) {
    return 'communicates_with';
  }
  return 'depends_on';
};

interface ResolvedEntity {
  euid: string;
  docId: string;
}

/**
 * One resolution-and-write step the run loop performs per source entity.
 * Build it up while iterating dependencies, then flush a single bulk
 * update at the end so a single source with N outgoing dependencies
 * costs one ES update operation, not N.
 */
interface PendingSourceUpdate {
  docId: string;
  // Per relationship type, the deduplicated set of target EUIDs derived
  // from this run's dependency features.
  edges: Map<KiRelationshipType, Set<string>>;
}

export interface KiRelationshipsRunDeps {
  reader: StreamsKnowledgeIndicatorsReader;
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  abortController: AbortController;
}

/**
 * One pass of the KI relationship maintainer.
 *
 * Behavior:
 *
 *  1. Fetch every Streams `dependency` feature via the reader. No
 *     min-confidence filter is applied: the existing min-confidence knob
 *     is for entity features (gates which streams produce entities at
 *     all). Dependencies are inherently rarer signals; we trust whatever
 *     the LLM emitted and let the operator de-noise upstream by tuning
 *     prompts or excluding features.
 *
 *  2. For each dependency, resolve `properties.source` and
 *     `properties.target` against the entities index, scoping by
 *     `entity.source` matching `stream:${feature.stream_name}:*`. This
 *     lineage scoping is what disambiguates two services that share a
 *     logical name on different streams (e.g. `service:order` on
 *     `logs.prod` vs `logs.staging`).
 *
 *  3. Group resolved (source, type, target) edges by source EUID and
 *     bulk-update each source entity once. Each run REPLACES the source
 *     entity's KI-derived relationship sets entirely — KI dependencies
 *     are derived signals and should not accumulate stale edges across
 *     runs after the underlying features have expired or been excluded.
 *
 *     This replace-per-run model is safe because nothing else in the
 *     entity store currently writes to `relationships.depends_on` /
 *     `relationships.communicates_with`. If that ever changes, this code
 *     needs to switch to a sub-namespaced relationship key (e.g.
 *     `relationships.ki_derived.depends_on`) before the new writer lands.
 */
export const runKiRelationships = async (
  deps: KiRelationshipsRunDeps
): Promise<KiRelationshipsLastRun> => {
  const { reader, esClient, logger, namespace, abortController } = deps;

  const dependencies = await reader.listDependencyFeatures({});
  if (abortController.signal.aborted) {
    return emptyResult(0);
  }
  if (dependencies.length === 0) {
    logger.debug('KI relationships: no dependency features found, skipping');
    return emptyResult(0);
  }

  const index = getLatestEntitiesIndexName(namespace);
  const pendingUpdates = new Map<string, PendingSourceUpdate>();
  let sourceUnresolved = 0;
  let targetUnresolved = 0;

  for (const dep of dependencies) {
    if (abortController.signal.aborted) break;
    const props = dep.properties as { source?: unknown; target?: unknown; protocol?: unknown };
    const source = typeof props.source === 'string' ? props.source : undefined;
    const target = typeof props.target === 'string' ? props.target : undefined;
    if (!source || !target) {
      logger.debug(
        `KI relationships: dependency ${dep.id} on ${dep.stream_name} is missing source/target; skipping`
      );
      continue;
    }
    if (source === target) {
      // A self-dependency is not meaningful as an edge. The LLM
      // sometimes emits these for self-discovery features; drop them.
      logger.debug(
        `KI relationships: dependency ${dep.id} is a self-edge ('${source}' → '${target}'); skipping`
      );
      continue;
    }

    const [sourceEntity, targetEntity] = await Promise.all([
      resolveByNameAndStream(esClient, index, source, dep.stream_name),
      resolveByNameAndStream(esClient, index, target, dep.stream_name),
    ]);

    if (!sourceEntity) {
      sourceUnresolved += 1;
      logger.debug(
        `KI relationships: source '${source}' on '${dep.stream_name}' unresolved (entity not yet in store)`
      );
      continue;
    }
    if (!targetEntity) {
      targetUnresolved += 1;
      logger.debug(
        `KI relationships: target '${target}' on '${dep.stream_name}' unresolved (entity not yet in store)`
      );
      continue;
    }

    const relType = protocolToRelationshipType(
      typeof props.protocol === 'string' ? props.protocol : undefined
    );

    const existing = pendingUpdates.get(sourceEntity.euid);
    if (existing) {
      const set = existing.edges.get(relType) ?? new Set<string>();
      set.add(targetEntity.euid);
      existing.edges.set(relType, set);
    } else {
      pendingUpdates.set(sourceEntity.euid, {
        docId: sourceEntity.docId,
        edges: new Map([[relType, new Set([targetEntity.euid])]]),
      });
    }
  }

  if (pendingUpdates.size === 0) {
    return {
      dependenciesProcessed: dependencies.length,
      sourceUnresolved,
      targetUnresolved,
      sourcesUpdated: 0,
      edgesWritten: 0,
    };
  }

  const updates = Array.from(pendingUpdates.values()).map(({ docId, edges }) => {
    const doc: Record<string, unknown> = {};
    for (const [relType, targets] of edges) {
      // Replace-per-run semantics: dotted-key path resolves to
      // `entity.relationships.<type>` and overwrites whatever was
      // there. `bulkUpdateEntityDocs` runs `unflattenObject` so
      // `entity.relationships.depends_on.ids` becomes a nested object.
      doc[`entity.relationships.${relType}.ids`] = Array.from(targets).sort();
    }
    return { docId, doc };
  });

  let edgesWritten = 0;
  for (const update of updates) {
    for (const value of Object.values(update.doc)) {
      if (Array.isArray(value)) edgesWritten += value.length;
    }
  }

  logger.debug(
    `KI relationships: writing ${edgesWritten} edge(s) across ${updates.length} source entity update(s)`
  );

  const bulkResult = await bulkUpdateEntityDocs(esClient, { index, updates });
  if (bulkResult.errors) {
    const failureCount = bulkResult.items.filter(
      (item) => Object.values(item)[0]?.error !== undefined
    ).length;
    // We tolerate partial bulk failures here. retry_on_conflict already
    // covers concurrent-update races; remaining errors typically mean an
    // entity was deleted between our resolution query and the bulk
    // update, which we would just retry next run anyway.
    logger.warn(
      `KI relationships: bulk update completed with ${failureCount} item failure(s); will retry on next run`
    );
  }

  return {
    dependenciesProcessed: dependencies.length,
    sourceUnresolved,
    targetUnresolved,
    sourcesUpdated: updates.length,
    edgesWritten,
  };
};

const emptyResult = (dependenciesProcessed: number): KiRelationshipsLastRun => ({
  dependenciesProcessed,
  sourceUnresolved: 0,
  targetUnresolved: 0,
  sourcesUpdated: 0,
  edgesWritten: 0,
});

/**
 * Look up a single entity by `entity.name` AND lineage scoping on
 * `entity.source`. The `entity.source` array stores values in the form
 * `stream:${streamName}:${subtype}` (set by the KI definition builder via
 * a literal field evaluation in PR-D); we do a wildcard match that pins
 * the stream and accepts any subtype. Wildcard against an array field
 * matches if any element matches.
 *
 * Returns `null` (rather than throwing) when no entity matches, so the
 * caller can count and continue rather than abort the loop. If multiple
 * entities match (should not happen if extraction is consistent) we pick
 * the lexicographically first EUID for determinism — better than picking
 * arbitrarily.
 */
const resolveByNameAndStream = async (
  esClient: ElasticsearchClient,
  index: string,
  name: string,
  streamName: string
): Promise<ResolvedEntity | null> => {
  const response = await esClient.search<{
    entity: { id?: string; name?: string; source?: string[] };
  }>({
    index,
    size: 2,
    _source: ['entity.id'],
    sort: [{ 'entity.id': { order: 'asc' } }],
    query: {
      bool: {
        filter: [
          { term: { 'entity.name': name } },
          { wildcard: { 'entity.source': `stream:${streamName}:*` } },
        ],
      },
    },
  });

  const hits = response.hits.hits;
  if (hits.length === 0) return null;
  const top = hits[0];
  const euid = top._source?.entity?.id;
  if (!euid || !top._id) return null;
  return { euid, docId: top._id };
};
