/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { ExitSpanPair } from './discover_exit_spans';

const APM_TRACES_INDEX = 'traces-apm*,apm-*,traces-*.otel-*';
const PROCESSOR_EVENT = 'processor.event';
const PARENT_ID = 'parent.id';
const SERVICE_NAME = 'service.name';

/**
 * One observed exit resource and the downstream services it resolved to.
 * `targets` is empty when the resource did not produce a child transaction
 * (e.g. a database or external endpoint) — such resources become backend nodes.
 */
export interface ResolvedResource {
  resource: string;
  /** Downstream service EUIDs. Empty → unresolved → render as a backend node. */
  targets: string[];
}

/**
 * Resolved data per source service: each observed exit resource together with the
 * downstream service EUIDs it resolved to (if any).
 *
 * Keyed by source service name (not EUID) to match the ExitSpanPair.sourceService field.
 */
export interface ResolvedServiceDependency {
  resources: ResolvedResource[];
}

/**
 * Maps sourceService (service.name) → resolved dependency information.
 *
 * Resolution works the same way as APM's `fetchTransactionsFromExitSpans`:
 * a transaction whose `parent.id` equals an exit span's `span.id` IS the
 * downstream service. We query `terms(parent.id, [...allSpanIds])` and fold
 * the results back to (sourceService, resource) pairs.
 *
 * Per-resource correspondence is preserved: each `ResolvedResource` records
 * which downstream services (if any) were reached through that specific resource.
 * This is what lets the caller distinguish a resolved resource — which should be
 * collapsed into a service→service edge — from an unresolved one — which should
 * become a service→backend edge.
 *
 * Service EUID format: `service:${service.name}` (single-field identity, see
 * entity_store/common/domain/definitions/service.ts identityField.singleField).
 */
export const resolveDownstreamServices = async ({
  esClient,
  exitSpans,
  windowStart,
  windowEnd,
  logger,
}: {
  esClient: ElasticsearchClient;
  exitSpans: ExitSpanPair[];
  windowStart: string;
  windowEnd: string;
  logger: Logger;
}): Promise<Map<string, ResolvedServiceDependency>> => {
  // Build a map from spanId → { sourceService, resource } so we can attribute
  // each resolved child transaction back to its specific (source, resource) pair.
  const spanToSource = new Map<string, { sourceService: string; resource: string }>();
  for (const pair of exitSpans) {
    for (const spanId of pair.spanIds) {
      spanToSource.set(spanId, { sourceService: pair.sourceService, resource: pair.resource });
    }
  }

  // Seed the result map with all (sourceService, resource) pairs discovered.
  // Uses a composite key so we can look up and update by (sourceService, resource).
  // An unresolved resource keeps targets: [] and becomes a backend node.
  const pairKey = (sourceService: string, resource: string) => `${sourceService}\0${resource}`;
  const perPair = new Map<string, ResolvedResource>();

  for (const { sourceService, resource } of exitSpans) {
    const key = pairKey(sourceService, resource);
    if (!perPair.has(key)) {
      perPair.set(key, { resource, targets: [] });
    }
  }

  // Build the top-level result map, one entry per source service.
  const result = new Map<string, ResolvedServiceDependency>();
  for (const { sourceService, resource } of exitSpans) {
    if (!result.has(sourceService)) {
      result.set(sourceService, { resources: [] });
    }
    const dep = result.get(sourceService)!;
    const key = pairKey(sourceService, resource);
    const pair = perPair.get(key)!;
    // Add the ResolvedResource reference once per (sourceService, resource) pair.
    if (!dep.resources.includes(pair)) {
      dep.resources.push(pair);
    }
  }

  if (spanToSource.size === 0) return result;

  const allSpanIds = [...spanToSource.keys()];

  // Resolve in chunks to keep the terms query bounded.
  const CHUNK_SIZE = 1000;
  for (let offset = 0; offset < allSpanIds.length; offset += CHUNK_SIZE) {
    const chunk = allSpanIds.slice(offset, offset + CHUNK_SIZE);

    const resp = await esClient
      .search<
        unknown,
        {
          by_parent: {
            buckets: Array<{
              key: string;
              // _source filtering returns nested JSON, not dot-notation keys.
              downstream_service: {
                // fields API resolves aliases (e.g. OTel passthrough); _source does not.
                hits: { hits: Array<{ fields?: { 'service.name'?: string[] } }> };
              };
            }>;
          };
        }
      >({
        index: APM_TRACES_INDEX,
        allow_no_indices: true,
        ignore_unavailable: true,
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [PROCESSOR_EVENT]: 'transaction' } },
              { terms: { [PARENT_ID]: chunk } },
              { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
            ],
          },
        },
        aggs: {
          by_parent: {
            terms: {
              field: PARENT_ID,
              size: chunk.length,
            },
            aggs: {
              downstream_service: {
                top_hits: {
                  size: 1,
                  // Use fields (not _source) so aliases like service.name resolve on OTel-native docs.
                  _source: false,
                  fields: [SERVICE_NAME],
                },
              },
            },
          },
        },
      })
      .catch((err: Error) => {
        logger.warn(`[service-dependencies] resolve downstream query failed: ${err.message}`);
        return null;
      });

    if (!resp) continue;

    for (const bucket of resp.aggregations?.by_parent.buckets ?? []) {
      const spanId = bucket.key;
      // Guard `service` as well — a doc whose _source lacks a `service` object
      // (e.g. OTel-native, or a partial _source return) would throw without `?.`.
      // fields always returns arrays; take the first value.
      const downstreamName = bucket.downstream_service.hits.hits[0]?.fields?.['service.name']?.[0];
      if (!downstreamName) continue;

      const source = spanToSource.get(spanId);
      if (!source) continue;

      const key = pairKey(source.sourceService, source.resource);
      const pair = perPair.get(key);
      if (!pair) continue;

      // Service EUID = `service:${service.name}` (singleField identity, no hash).
      // Guard against self-edges: skip if the downstream is the same service as the source.
      const targetEuid = `service:${downstreamName}`;
      if (downstreamName === source.sourceService) continue;

      if (!pair.targets.includes(targetEuid)) {
        pair.targets.push(targetEuid);
      }
    }
  }

  const resolvedCount = [...result.values()].filter((dep) =>
    dep.resources.some((r) => r.targets.length > 0)
  ).length;

  logger.info(
    `[service-dependencies] resolveDownstreamServices: ${resolvedCount} / ${result.size} services have at least one resolved resource`
  );

  return result;
};
