/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

/**
 * Pre-flight fix for ESQL `cluster_block_exception` on closed data-stream backing indices.
 *
 * ESQL has no `ignore_unavailable`. When a data stream has a closed backing index,
 * the entire FROM clause fails at resolution time — before any shard-level exclusion applies.
 * Negating the backing index name alone does NOT help; you must negate the data stream name
 * and re-add only its open backing indices explicitly.
 *
 * Example — input patterns: ['logs-myapp-*', '-logs-myapp-debug-*']
 *   data stream `logs-myapp-prod` has backing indices: [.ds-...-000001 (open), .ds-...-000002 (closed)]
 *   → openBackingIndices: ['.ds-...-000001']
 *   → negations:          ['-logs-myapp-prod']
 *   Caller builds FROM:   logs-myapp-*, .ds-...-000001, -logs-myapp-debug-*, -logs-myapp-prod
 *
 * Both arrays must be spliced into the ESQL FROM-clause pattern list in order:
 *   [...originalPositives, ...openBackingIndices, ...userExclusions, ...negations]
 *
 * Returns `{ openBackingIndices: [], negations: [] }` on empty input or resolve failure.
 */
export interface ClosedIndexAdjustments {
  /** Open backing indices of affected data streams — must be inserted as positive patterns BEFORE any negations. */
  openBackingIndices: string[];
  /**
   * Negation patterns (`-<name>`) for affected data stream names and closed standalone indices.
   * Must be inserted AFTER all positive includes.
   */
  negations: string[];
}

const toArray = (v: string | string[]): string[] => ([] as string[]).concat(v);

// The ES client joins name arrays with commas then calls encodeURIComponent, so each comma
// becomes %2C (3 bytes). Elasticsearch's Netty HTTP server rejects request lines > 4096 bytes,
// so we cap each batch well below that limit.
const MAX_URL_NAMES_BYTES = 3_500;
const BATCH_CONCURRENCY_LIMIT = 30;

const chunkByUrlLength = (names: string[]): string[][] => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;

  for (const name of names) {
    const cost = name.length + (current.length > 0 ? 3 : 0); // 3 bytes for %2C separator
    if (current.length > 0 && currentBytes + cost > MAX_URL_NAMES_BYTES) {
      chunks.push(current);
      current = [name];
      currentBytes = name.length;
    } else {
      current.push(name);
      currentBytes += cost;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};

const resolveArgs = (name: string[]) => ({
  name,
  expand_wildcards: ['open', 'closed', 'hidden'] as Array<'open' | 'closed' | 'hidden'>,
  ignore_unavailable: true,
  allow_no_indices: true,
});

export const resolveClosedIndexAdjustments = async (
  esClient: ElasticsearchClient,
  includePatterns: string[],
  logger: Logger
): Promise<ClosedIndexAdjustments> => {
  const positivePatterns = includePatterns.filter((p) => !p.startsWith('-'));
  if (positivePatterns.length === 0) {
    return { openBackingIndices: [], negations: [] };
  }

  try {
    const resolved = await esClient.indices.resolveIndex(resolveArgs(positivePatterns));

    // Closed standalone indices (not part of a data stream): negate by concrete name.
    const closedStandaloneNegations = resolved.indices
      .filter((i) => i.attributes?.includes('closed'))
      .map((i) => `-${i.name}`);

    const openBackingIndices: string[] = [];
    const dataStreamNegations: string[] = [];

    const backingIndexNames = resolved.data_streams.flatMap((ds) => toArray(ds.backing_indices));
    if (backingIndexNames.length > 0) {
      // The first resolveIndex call returns backing index names without open/closed attributes,
      // so a second round is needed to learn their status. Batching avoids a
      // too_long_http_line_exception when many backing indices would push the URL past the
      // Elasticsearch Netty limit of 4096 bytes. Concurrency is capped to avoid overwhelming
      // the cluster when there are many chunks.
      const limit = pLimit(BATCH_CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        chunkByUrlLength(backingIndexNames).map((chunk) =>
          limit(() => esClient.indices.resolveIndex(resolveArgs(chunk)))
        )
      );

      const closedBackingNames = new Set(
        batchResults
          .flatMap((r) => r.indices)
          .filter((i) => i.attributes?.includes('closed'))
          .map((i) => i.name)
      );

      for (const ds of resolved.data_streams) {
        const backing = toArray(ds.backing_indices);
        if (!backing.some((bi) => closedBackingNames.has(bi))) continue;

        // Negate the data stream name so ESQL never expands it to its backing indices
        // (which would hit the closed one before the exclusion applies).
        dataStreamNegations.push(`-${ds.name}`);

        // Add back every open backing index explicitly so coverage is preserved.
        openBackingIndices.push(...backing.filter((bi) => !closedBackingNames.has(bi)));
      }
    }

    const negations = [...closedStandaloneNegations, ...dataStreamNegations];

    if (negations.length > 0 || openBackingIndices.length > 0) {
      const preview = negations.slice(0, 20).join(', ');
      const overflow = negations.length > 20 ? ` … and ${negations.length - 20} more` : '';
      logger.warn(
        `Detected closed backing indices. Excluding data streams/indices: ${preview}${overflow}`
      );
    }

    return { openBackingIndices, negations };
  } catch (error) {
    logger.warn(
      `Failed to resolve closed indices (falling back to unfiltered patterns): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { openBackingIndices: [], negations: [] };
  }
};
