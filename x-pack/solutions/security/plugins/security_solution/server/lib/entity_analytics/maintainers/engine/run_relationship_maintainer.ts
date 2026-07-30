/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { errors as esErrors } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, EntityMetadataClient } from '@kbn/entity-store/server';

import type {
  RelationshipIntegrationConfig,
  RelationshipMaintainerName,
  CompositeAfterKey,
  CompositeBucket,
} from './types';
import {
  buildActorDiscoveryQuery,
  buildActorPageFilter,
  buildLookbackFilter,
} from './build_actor_discovery_query';
import { buildTargetsPerActorQuery } from './build_targets_per_actor_query';
import { parseTargetsPerActorRows } from './parse_targets_per_actor_rows';
import { writeEntityIds, type WriteEntityIdsResult } from './update_entities';
import {
  writeRelationshipMetadatas,
  type WriteRelationshipMetadatasResult,
} from './write_relationship_metadatas';
import { LOOKBACK_WINDOW, MAX_ITERATIONS, DEFAULT_ESQL_TIMEOUT_MS } from './constants';
import { assertValidNamespace } from './validate_namespace';
import type {
  RelationshipMaintainerSourceResult,
  RelationshipMaintainerTelemetryCollector,
} from '../types';
export type { RelationshipMaintainerSourceResult, RelationshipMaintainerTelemetryCollector };

interface CompositeAggregations {
  users: {
    buckets: CompositeBucket[];
    after_key?: CompositeAfterKey;
  };
}

interface EsqlQueryResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * Detects the index-not-found case the engine recovers from gracefully (Step 1
 * runs against `logs-{integration}-{namespace}` data streams that don't exist
 * until the integration ships at least one document).
 *
 * Uses the typed `ResponseError` from `@elastic/elasticsearch` rather than
 * duck-typing two error shapes — the contract is anchored to the client we
 * actually depend on, so a future client upgrade that changes internal
 * representation surfaces as a compile-time signal rather than silent
 * failure.
 */
function isIndexNotFound(err: unknown): boolean {
  return (
    err instanceof esErrors.ResponseError && err.body?.error?.type === 'index_not_found_exception'
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

function mergeRelTypeApplied(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const merged = { ...a };
  for (const [k, v] of Object.entries(b)) {
    merged[k] = (merged[k] ?? 0) + v;
  }
  return merged;
}

/** Returns the actor page on success, null to stop iteration (index missing or aborted), throws on real error. */
async function fetchActorPage(
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  afterKey: CompositeAfterKey | undefined,
  transportOpts: { signal?: AbortSignal; requestTimeout?: number } | undefined,
  signal: AbortSignal | undefined
): Promise<{ buckets: CompositeBucket[]; newAfterKey: CompositeAfterKey | undefined } | null> {
  try {
    const result = await esClient.search(
      { index: config.indexPattern(namespace), ...buildActorDiscoveryQuery(config, afterKey) },
      transportOpts
    );
    const aggs = result.aggregations as CompositeAggregations | undefined;
    return {
      buckets: aggs?.users?.buckets ?? [],
      newAfterKey: aggs?.users?.after_key,
    };
  } catch (err) {
    if (isIndexNotFound(err)) {
      logger.info(`[${config.id}] Index "${config.indexPattern(namespace)}" not found, skipping`);
      return null;
    }
    if (signal?.aborted) {
      logger.info(`[${config.id}] Aborted during composite aggregation`);
      return null;
    }
    logger.error(`[${config.id}] Composite aggregation failed: ${errMsg(err)}`);
    throw err;
  }
}

/** Returns the ES|QL result on success, null to stop iteration (aborted), throws on real error. */
async function fetchTargetsForActors(
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  buckets: CompositeBucket[],
  transportOpts: { signal?: AbortSignal; requestTimeout?: number } | undefined,
  signal: AbortSignal | undefined
): Promise<EsqlQueryResult | null> {
  const esqlFilter = {
    bool: {
      filter: [...buildLookbackFilter(config), buildActorPageFilter(config, buckets)],
    },
  };
  try {
    const result = await esClient.esql.query(
      { query: buildTargetsPerActorQuery(config, namespace), filter: esqlFilter },
      transportOpts
    );
    // Defense in depth: ES|QL responses are typed loosely on the client,
    // and a partial-success or future protocol change could omit columns/values.
    // Guarding here means the engine logs a warning and skips the page rather
    // than crashing in `parseTargetsPerActorRows` with a misleading TypeError.
    const typed = result as unknown as Partial<EsqlQueryResult>;
    if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
      logger.warn(
        `[${config.id}] ES|QL returned unexpected response shape (columns or values not arrays); skipping page`
      );
      return null;
    }

    return { columns: typed.columns, values: typed.values };
  } catch (err) {
    if (signal?.aborted) {
      logger.info(`[${config.id}] Aborted during ES|QL query`);
      return null;
    }
    logger.error(`[${config.id}] ES|QL query failed: ${errMsg(err)}`);
    throw err;
  }
}

/**
 * Runs Step 1 + Step 2 + write for one integration end-to-end. Writes each
 * page's records to the entity store immediately after parsing, so the engine
 * never holds more than one page of records in memory at a time.
 *
 * Memory bound: one page's records at a time (≤ COMPOSITE_PAGE_SIZE per page).
 *
 * Abort semantics: if the abort fires mid-pagination, the partial records
 * collected so far are still written before returning (best-effort
 * persistence — the records are derived from the run, not authoritative,
 * and partial writes are no worse than a re-run).
 */
async function runIntegration(
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  crudClient: EntityUpdateClient,
  entityMetadataClient: EntityMetadataClient,
  signal: AbortSignal | undefined,
  metadataContext: { scanId: string; observedAt: string },
  requestTimeoutMs?: number
): Promise<{
  buckets: number;
  recordsCount: number;
  write: WriteEntityIdsResult;
  metadata: WriteRelationshipMetadatasResult;
  outcome: 'index_missing' | 'empty' | 'partial' | 'producing' | 'error';
  iterations: number;
  truncated: boolean;
}> {
  let afterKey: CompositeAfterKey | undefined;
  let iterations = 0;
  let truncated = false;
  let totalBuckets = 0;
  let totalRecordsCount = 0;
  const timeoutMs = requestTimeoutMs ?? DEFAULT_ESQL_TIMEOUT_MS;
  const transportOpts: { signal?: AbortSignal; requestTimeout?: number } = {
    requestTimeout: timeoutMs,
  };
  if (signal) transportOpts.signal = signal;
  let outcome: 'index_missing' | 'empty' | 'partial' | 'producing' | 'error' = 'producing';

  // Per-page write accumulators — initialized before the loop, accumulated inside.
  let totalWriteResult: WriteEntityIdsResult = {
    updated: 0,
    notFound: 0,
    errors: 0,
    droppedTargets: 0,
    relationshipTypeApplied: {},
    succeededEntityIds: new Set(),
  };
  let totalMetadataResult: WriteRelationshipMetadatasResult = { docsAttempted: 0, docsApplied: 0 };

  try {
    do {
      if (signal?.aborted) {
        logger.info(`[${config.id}] Aborted during pagination`);
        outcome = totalBuckets === 0 ? 'empty' : 'partial';
        break;
      }
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        logger.warn(`[${config.id}] Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping`);
        outcome = 'partial';
        truncated = true;
        break;
      }

      const actorPage = await fetchActorPage(
        config,
        esClient,
        logger,
        namespace,
        afterKey,
        transportOpts,
        signal
      );
      if (actorPage === null) {
        outcome = signal?.aborted ? (totalBuckets === 0 ? 'empty' : 'partial') : 'index_missing';
        break;
      }

      const { buckets, newAfterKey } = actorPage;
      logger.info(`[${config.id}] Found ${buckets.length} user buckets`);
      totalBuckets += buckets.length;
      if (buckets.length === 0) {
        if (iterations === 1) outcome = 'empty';
        break;
      }

      const esqlResult = await fetchTargetsForActors(
        config,
        esClient,
        logger,
        namespace,
        buckets,
        transportOpts,
        signal
      );
      if (esqlResult === null) {
        outcome = 'partial';
        break;
      }

      const { columns, values } = esqlResult;
      const pageRecords = parseTargetsPerActorRows(columns, values, config, logger);
      logger.debug(`[${config.id}] Produced ${pageRecords.length} records`);
      totalRecordsCount += pageRecords.length;

      // Stream per-page: write entity IDs immediately after parsing each page.
      // Both writes are inside the loop so any transport failure sets outcome:
      // 'error' and the outer loop continues to other integrations.
      if (pageRecords.length > 0) {
        const pageWrite = await writeEntityIds(
          crudClient,
          logger,
          pageRecords,
          esClient,
          namespace,
          config.validateTargetIds
        );
        const { validTargetIds, succeededEntityIds } = pageWrite;
        // Only write metadata for actors that actually landed in the latest index.
        // When bulkUpdateEntity returns a 404 (actor not yet extracted), we skip
        // the metadata write for that actor so the two stores stay in sync.
        const actorFiltered = pageRecords.filter(
          (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
        );
        // When target validation also ran, further restrict to the validated target set.
        const metadataRecords = validTargetIds
          ? actorFiltered.flatMap((r) => {
              const filteredRels: Record<string, string[]> = {};
              for (const [relType, targetEuids] of Object.entries(r.relationships)) {
                const valid = targetEuids.filter((id) => validTargetIds.has(id));
                if (valid.length > 0) filteredRels[relType] = valid;
              }
              return Object.keys(filteredRels).length > 0
                ? [{ ...r, relationships: filteredRels }]
                : [];
            })
          : actorFiltered;
        const pageMetadata = await writeRelationshipMetadatas(
          entityMetadataClient,
          logger,
          metadataRecords,
          {
            scanId: metadataContext.scanId,
            lookbackWindow: config.disableLookbackWindow ? '' : LOOKBACK_WINDOW,
            entitySource: config.id,
            observedAt: metadataContext.observedAt,
          }
        );

        // Accumulate counters across pages.
        totalWriteResult = {
          updated: totalWriteResult.updated + pageWrite.updated,
          notFound: totalWriteResult.notFound + pageWrite.notFound,
          errors: totalWriteResult.errors + pageWrite.errors,
          droppedTargets: totalWriteResult.droppedTargets + pageWrite.droppedTargets,
          relationshipTypeApplied: mergeRelTypeApplied(
            totalWriteResult.relationshipTypeApplied,
            pageWrite.relationshipTypeApplied
          ),
          succeededEntityIds: pageWrite.succeededEntityIds,
          validTargetIds: pageWrite.validTargetIds,
        };
        totalMetadataResult = {
          docsAttempted: totalMetadataResult.docsAttempted + pageMetadata.docsAttempted,
          docsApplied: totalMetadataResult.docsApplied + pageMetadata.docsApplied,
        };
      }

      // Composite agg's documented termination contract is "stop when after_key
      // is absent." Trust newAfterKey directly rather than inferring termination
      // from a partial-page heuristic — composite aggs can return a partial last
      // page with after_key still set in some edge cases (e.g. sub-aggregation
      // filters that drop bucket candidates).
      afterKey = newAfterKey;
    } while (afterKey);

    // When truncated, the final loop pass incremented `iterations` before
    // breaking without fetching a page — clamp to actual pages completed.
    const completedIterations = truncated ? MAX_ITERATIONS : iterations;
    return {
      buckets: totalBuckets,
      recordsCount: totalRecordsCount,
      write: totalWriteResult,
      metadata: totalMetadataResult,
      outcome,
      iterations: completedIterations,
      truncated,
    };
  } catch (err) {
    logger.error(`[${config.id}] Integration failed: ${errMsg(err)}`);
    return {
      buckets: totalBuckets,
      recordsCount: totalRecordsCount,
      write: {
        updated: 0,
        notFound: 0,
        errors: 0,
        droppedTargets: 0,
        relationshipTypeApplied: {},
        succeededEntityIds: new Set(),
      },
      metadata: { docsAttempted: 0, docsApplied: 0 },
      outcome: 'error',
      iterations,
      truncated: false,
    };
  }
}

/**
 * Run loop for relationship maintainers.
 * Iterates over the provided integration configs and runs the composite agg +
 * ES|QL pipeline for each, writing optimistic EUIDs directly to
 * `entity.relationships[relType].ids` after each integration completes.
 *
 * Memory: bounded by one integration's record count
 * (≤ COMPOSITE_PAGE_SIZE × MAX_ITERATIONS) — see `runIntegration` for the
 * streaming write rationale.
 *
 * Abort: an abort fired between integrations skips the remaining
 * integrations entirely. An abort fired *during* an integration still
 * persists that integration's partial records (best-effort), then exits
 * the outer loop on the next iteration.
 */
export const runRelationshipMaintainer = async ({
  esClient,
  cpsEsClient,
  logger,
  namespace,
  crudClient,
  entityMetadataClient,
  integrations,
  maintainerName,
  signal,
  requestTimeoutMs,
  telemetryCollector,
}: {
  esClient: ElasticsearchClient;
  cpsEsClient?: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  crudClient: EntityUpdateClient;
  entityMetadataClient: EntityMetadataClient;
  integrations: RelationshipIntegrationConfig[];
  /** Identifies which maintainer is running — embedded in per-integration completion logs for unambiguous attribution. */
  maintainerName: RelationshipMaintainerName;
  signal?: AbortSignal;
  /** Per-request timeout in milliseconds for ES client calls (search + esql.query). Defaults to DEFAULT_ESQL_TIMEOUT_MS (60s). */
  requestTimeoutMs?: number;
  /**
   * Optional. Engine populates one entry per integration into `sources` and
   * accumulates per-rel-type applied counts in `relationshipTypeApplied` for callers
   * that want full-fidelity run telemetry.
   */
  telemetryCollector?: RelationshipMaintainerTelemetryCollector;
}): Promise<{
  totalBuckets: number;
  totalRecords: number;
  totalWritten: number;
  /**
   * Count of actor EUIDs the engine produced records for, but whose entity
   * store record returned a 404 from `bulkUpdateEntity`. A 404 means the
   * actor isn't in the store yet — extraction lag, namespace mismatch, or
   * suppression. Surfaced here (rather than silently logged) so the caller
   * (task scheduler / alerting) can react when the count is sustained.
   */
  totalNotFound: number;
  /** Count of non-404 errors returned by `bulkUpdateEntity` (5xx, etc.). */
  totalWriteErrors: number;
  /** Count of relationship metadata docs successfully appended to the metadata datastream. */
  totalMetadataDocsApplied: number;
  /** Count of target EUIDs pruned because they don't exist in the entity store. */
  totalDroppedTargets: number;
  /** Total composite-agg pagination passes across all integrations. */
  totalIterations: number;
  /** True if any integration hit MAX_ITERATIONS and stopped early. */
  truncated: boolean;
  lastRunTimestamp: string;
}> => {
  // Defense-in-depth: namespace flows raw into eight `indexPattern(namespace)`
  // callbacks plus the Azure override fn. One guard at the engine boundary
  // is cheaper and stronger than trusting all callers.
  assertValidNamespace(namespace);

  // Capture run-start time as the watermark. Using end-of-run would exclude any
  // entity whose last_seen advanced between query execution and run completion —
  // a silent permanent gap on busy stores with long paginated runs.
  const runStartTimestamp = new Date().toISOString();

  const readClient = cpsEsClient ?? esClient;

  // One scan_id + observedAt for the whole maintainer pass. Every metadata doc
  // doc emitted across all integrations in this run carries the same values
  // so a reader can group records by maintainer-run.
  const metadataContext = {
    scanId: randomUUID(),
    observedAt: new Date().toISOString(),
  };

  let totalBuckets = 0;
  let totalRecords = 0;
  let totalWritten = 0;
  let totalNotFound = 0;
  let totalWriteErrors = 0;
  let totalMetadataDocsApplied = 0;
  let totalDroppedTargets = 0;
  let totalIterations = 0;
  let truncated = false;

  for (const config of integrations) {
    if (signal?.aborted) {
      logger.info('Relationship maintainer aborted, skipping remaining integrations');
      break;
    }
    logger.info(`[${config.id}] Processing integration: ${config.name}`);
    const integrationStartMs = Date.now();
    const {
      buckets,
      recordsCount,
      write,
      metadata,
      outcome,
      iterations,
      truncated: integrationTruncated,
    } = await runIntegration(
      config,
      readClient,
      logger,
      namespace,
      crudClient,
      entityMetadataClient,
      signal,
      metadataContext,
      requestTimeoutMs
    );

    const durationMs = Date.now() - integrationStartMs;
    logger.info(
      `[${config.id}][${maintainerName}] Integration complete: ` +
        `outcome=${outcome} slices=${iterations} records=${recordsCount} ` +
        `written=${write.updated} notFound=${write.notFound} errors=${write.errors} ` +
        `truncated=${integrationTruncated} durationMs=${durationMs}`
    );

    totalIterations += iterations;
    if (integrationTruncated) truncated = true;

    if (outcome === 'error') {
      logger.warn(`[${config.id}] Integration failed; skipping totals accumulation for this run`);
    } else {
      totalBuckets += buckets;
      totalRecords += recordsCount;
      totalWritten += write.updated;
      totalNotFound += write.notFound;
      totalWriteErrors += write.errors;
      totalMetadataDocsApplied += metadata.docsApplied;
      totalDroppedTargets += write.droppedTargets;
    }

    if (telemetryCollector) {
      telemetryCollector.sources.push({
        id: config.id,
        scanned: buckets,
        qualified: recordsCount,
        outcome,
      });
      for (const [relType, count] of Object.entries(write.relationshipTypeApplied)) {
        telemetryCollector.relationshipTypeApplied[relType] =
          (telemetryCollector.relationshipTypeApplied[relType] ?? 0) + count;
      }
    }
  }

  return {
    totalBuckets,
    totalRecords,
    totalWritten,
    totalNotFound,
    totalWriteErrors,
    totalMetadataDocsApplied,
    totalDroppedTargets,
    totalIterations,
    truncated,
    lastRunTimestamp: runStartTimestamp,
  };
};
