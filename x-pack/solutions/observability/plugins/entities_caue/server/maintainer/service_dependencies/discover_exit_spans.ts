/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';

/**
 * APM spans and transactions are written to `traces-apm*,apm-*,traces-*.otel-*`
 * (confirmed from apm_sources_access/common/config_schema.ts defaults).
 * The `processor.event` field discriminates event types within those indices.
 */
const APM_TRACES_INDEX = 'traces-apm*,apm-*,traces-*.otel-*';
const PROCESSOR_EVENT = 'processor.event';
const SPAN_DESTINATION_SERVICE_RESOURCE = 'span.destination.service.resource';
const SERVICE_NAME = 'service.name';
const SPAN_ID = 'span.id';

/** Maximum composite agg pages to process in a single run (guards against pathological windows). */
const MAX_ITERATIONS = 100;
/**
 * Number of representative span.id samples per (service, resource) pair.
 * ES caps `top_hits.size` at `index.max_inner_result_window` (default 100); keep this ≤ 100.
 */
const SPAN_SAMPLE_SIZE = 20;
/** Composite bucket size per page. */
const PAGE_SIZE = 500;

export interface ExitSpanPair {
  sourceService: string;
  resource: string;
  spanIds: string[];
}

/**
 * Discovers (sourceService, exitResource, spanIds) pairs from APM span documents
 * in the given time window. Replaces APM's two-step trace sampling + exit span fetch.
 *
 * Uses a composite aggregation to page over (service.name, span.destination.service.resource)
 * buckets, collecting SPAN_SAMPLE_SIZE span.id values per bucket for downstream resolution.
 */
export const discoverExitSpans = async ({
  esClient,
  windowStart,
  windowEnd,
  randomSeed,
  logger,
}: {
  esClient: ElasticsearchClient;
  windowStart: string;
  windowEnd: string;
  /**
   * Seed for the random_score function on the span query. Using a per-run seed keeps paging
   * within a single run self-consistent while making successive runs sample different spans.
   * Because `depends_on.ids` union-merges across runs, edge coverage accumulates over time.
   */
  randomSeed: number;
  logger: Logger;
}): Promise<ExitSpanPair[]> => {
  const results: ExitSpanPair[] = [];
  let afterKey: Record<string, string | number | null> | undefined;
  let iterations = 0;

  do {
    if (iterations >= MAX_ITERATIONS) {
      logger.warn(
        `[service-dependencies] Hit MAX_ITERATIONS (${MAX_ITERATIONS}) while discovering exit spans; stopping early`
      );
      break;
    }
    iterations++;

    const resp = await esClient
      .search<
        unknown,
        {
          pairs: {
            after_key: Record<string, string | number | null>;
            buckets: Array<{
              key: { service_name: string; resource: string };
              // fields API resolves dot-notation aliases (e.g. OTel passthrough); _source does not.
              span_ids: { hits: { hits: Array<{ fields?: { 'span.id'?: string[] } }> } };
            }>;
          };
        }
      >({
        index: APM_TRACES_INDEX,
        allow_no_indices: true,
        ignore_unavailable: true,
        size: 0,
        // Wrap in function_score so `top_hits` (which sorts by _score desc) draws a random
        // sample per bucket rather than Lucene index order. Without randomisation, top_hits
        // returns the first N docs from the leading shard segment, which cluster by
        // trace/branch and can permanently exclude the majority branch of a fan-out resource
        // (e.g. api-gateway:3000 calling both java and dotnet — all samples from dotnet,
        // zero from java, so synth-go→synth-java edge is never resolved).
        query: {
          function_score: {
            query: {
              bool: {
                filter: [
                  { term: { [PROCESSOR_EVENT]: 'span' } },
                  { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
                  { range: { '@timestamp': { gte: windowStart, lte: windowEnd } } },
                ],
              },
            },
            // random_score lives inside a QueryDslFunctionScoreContainer, not on the
            // top-level QueryDslFunctionScoreQuery directly.
            functions: [{ random_score: { seed: randomSeed, field: '_seq_no' } }],
            boost_mode: 'replace',
          },
        },
        aggs: {
          pairs: {
            composite: {
              size: PAGE_SIZE,
              sources: [
                { service_name: { terms: { field: SERVICE_NAME } } },
                { resource: { terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE } } },
              ],
              ...(afterKey ? { after: afterKey } : {}),
            },
            aggs: {
              span_ids: {
                top_hits: {
                  size: SPAN_SAMPLE_SIZE,
                  // Use fields (not _source) so aliases like span.id resolve on OTel-native docs.
                  _source: false,
                  fields: [SPAN_ID],
                },
              },
            },
          },
        },
      })
      .catch((err: Error) => {
        logger.warn(`[service-dependencies] exit span discovery query failed: ${err.message}`);
        return null;
      });

    if (!resp) break;

    const buckets = resp.aggregations?.pairs.buckets ?? [];
    for (const bucket of buckets) {
      const spanIds = bucket.span_ids.hits.hits
        .map((hit) => {
          // fields always returns arrays; take the first value.
          return hit.fields?.['span.id']?.[0];
        })
        .filter((id): id is string => typeof id === 'string');
      if (spanIds.length > 0) {
        results.push({
          sourceService: bucket.key.service_name,
          resource: bucket.key.resource,
          spanIds,
        });
      }
    }

    afterKey = buckets.length === PAGE_SIZE ? resp.aggregations?.pairs.after_key : undefined;
  } while (afterKey !== undefined);

  logger.debug(
    `[service-dependencies] discoverExitSpans: ${results.length} pairs in ${iterations} pages`
  );
  return results;
};
