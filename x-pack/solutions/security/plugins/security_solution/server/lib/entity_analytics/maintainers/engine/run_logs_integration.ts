/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, EntityMetadataClient } from '@kbn/entity-store/server';

import type { RelationshipIntegrationConfig } from './types';
import {
  COMPOSITE_PAGE_SIZE,
  EXTRACT_QUERY_TIMEOUT_MS,
  LOOKBACK_WINDOW,
  LOOKBACK_WINDOW_MS,
  MAX_ITERATIONS,
} from './constants';
import {
  buildActorSliceProbeQuery,
  parseActorSliceProbeResult,
} from './build_actor_slice_probe_query';
import {
  buildActorSliceBoundaryQuery,
  parseActorSliceBoundaryResult,
} from './build_actor_slice_boundary_query';
import { buildTargetsPerActorQuery } from './build_targets_per_actor_query';
import { parseTargetsPerActorRows } from './parse_targets_per_actor_rows';
import { writeEntityIds, type WriteEntityIdsResult } from './update_entities';
import {
  writeRelationshipMetadatas,
  type WriteRelationshipMetadatasResult,
} from './write_relationship_metadatas';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

const ZERO_WRITE: WriteEntityIdsResult = {
  updated: 0,
  notFound: 0,
  errors: 0,
  droppedTargets: 0,
  relationshipTypeApplied: {},
  succeededEntityIds: new Set(),
};

const ZERO_METADATA: WriteRelationshipMetadatasResult = {
  docsAttempted: 0,
  docsApplied: 0,
};

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * Returns actor IDs to pass to the extract query, or undefined if the probe
 * used a probeActorKey (raw field value) rather than the full EUID. When
 * probeActorKey is set, the probe collects raw values like "backup_svc" while
 * the extract produces full EUIDs like "user:backup_svc@local" — the formats
 * differ, so the IN filter would never match and must be skipped.
 */
const extractActorIdsFilter = (
  config: RelationshipIntegrationConfig,
  actorIds: string[]
): string[] | undefined => {
  if (config.kind === 'override') return undefined;
  if (config.customActor?.probeActorKey != null) return undefined;
  return actorIds;
};

/**
 * Runs the probe query with SAMPLE first (cheap on large datasets). If SAMPLE
 * returns no actors — which happens on sparse indices where sampling misses all
 * docs — retries without SAMPLE to confirm there are genuinely no actors before
 * stopping. This keeps the probe fast on large indices while correctly handling
 * small/sparse ones.
 */
const runProbeWithFallback = async (
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  namespace: string,
  sliceStart: string,
  maxActors: number,
  transportOpts: { signal: AbortSignal } | undefined
) => {
  const sampledQuery = buildActorSliceProbeQuery(config, namespace, sliceStart, true);
  const sampledResponse = (await esClient.esql.query(
    { query: sampledQuery },
    transportOpts
  )) as EsqlResponse;
  const sampledResult = parseActorSliceProbeResult(
    sampledResponse.columns,
    sampledResponse.values,
    maxActors
  );
  if (sampledResult.sliceBoundary !== null) return sampledResult;

  const fullQuery = buildActorSliceProbeQuery(config, namespace, sliceStart, false);
  const fullResponse = (await esClient.esql.query(
    { query: fullQuery },
    transportOpts
  )) as EsqlResponse;
  return parseActorSliceProbeResult(fullResponse.columns, fullResponse.values, maxActors);
};

export interface RunLogsIntegrationResult {
  slices: number;
  recordsCount: number;
  write: WriteEntityIdsResult;
  metadata: WriteRelationshipMetadatasResult;
  outcome: 'index_missing' | 'empty' | 'aborted' | 'producing' | 'error';
  truncated: boolean;
}

export const runLogsIntegration = async (
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  crudClient: EntityUpdateClient,
  entityMetadataClient: EntityMetadataClient,
  signal: AbortSignal | undefined,
  metadataContext: { scanId: string; observedAt: string }
): Promise<RunLogsIntegrationResult> => {
  const transportOpts = signal ? { signal } : undefined;
  const maxActors = config.maxActorsPerSlice ?? COMPOSITE_PAGE_SIZE;

  let slices = 0;
  let recordsCount = 0;
  let truncated = false;
  let totalWrite: WriteEntityIdsResult = ZERO_WRITE;
  let totalMetadata: WriteRelationshipMetadatasResult = ZERO_METADATA;

  // TODO(https://github.com/elastic/kibana/issues/280917): Per-slice writes are safe for all
  // current configs (system_auth, system_security, elastic_defend, aws_cloudtrail) because the actor EUID is anchored to
  // host.id — the same actor always communicates with exactly its own host, so a per-slice
  // plain partial update is idempotent. Future high-confidence integrations (e.g. IDP-linked
  // users that are a single entity regardless of host) may have one actor entity communicating
  // with genuinely different targets across time slices. In that case, bulkUpdateEntity must
  // be extended to support Painless script upserts with array-union semantics so that
  // per-slice writes merge rather than overwrite relationship arrays.

  // LOOKBACK_WINDOW is ES date math ('now-30d') and cannot be parsed as ISO.
  // Use LOOKBACK_WINDOW_MS for JS Date arithmetic so +1ms slice advances work correctly.
  let sliceStart = new Date(Date.now() - LOOKBACK_WINDOW_MS).toISOString();

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      if (signal?.aborted) {
        logger.info(`[${config.id}] Aborted during slice loop`);
        return {
          slices,
          recordsCount,
          write: totalWrite,
          metadata: totalMetadata,
          outcome: 'aborted',
          truncated: false,
        };
      }

      // Step 1: Probe — find the time boundary covering ~maxActors distinct actors.
      const probeResult = await runProbeWithFallback(
        config,
        esClient,
        namespace,
        sliceStart,
        maxActors,
        transportOpts
      );

      if (probeResult.sliceBoundary === null) {
        // No actors found in probe — either nothing ever existed (slices === 0)
        // or we've exhausted all remaining docs after advancing sliceStart past
        // the previous slice. In both cases, stop the loop and fall through to
        // the write step so accumulated records from prior slices are not lost.
        logger.info(`[${config.id}] No actors found in probe, finishing`);
        break;
      }

      // Step 2: Extend (boundary query) — find the last event timestamp across
      // all actors in this slice, so the extract query covers the full activity
      // window for those actors without scanning all 30 days.
      let toDate: string;
      if (probeResult.isLastSlice) {
        toDate = new Date().toISOString();
      } else {
        const boundaryQuery = buildActorSliceBoundaryQuery(
          config,
          namespace,
          sliceStart,
          probeResult.sliceBoundary
        );
        const boundaryResponse = (await esClient.esql.query(
          { query: boundaryQuery },
          transportOpts
        )) as {
          columns: Array<{ name: string; type: string }>;
          values: unknown[][];
        };
        const extendedEnd = parseActorSliceBoundaryResult(
          boundaryResponse.columns,
          boundaryResponse.values
        );
        toDate = extendedEnd ?? probeResult.sliceBoundary;
      }

      // Step 3: Extract — collect actor→target relationships within the slice
      // window. The actorIds filter is skipped when the probe used a probeActorKey
      // (raw field values) because they don't match the extract's EUID format.
      const extractQuery = buildTargetsPerActorQuery(
        config,
        namespace,
        { fromDate: sliceStart, toDate },
        extractActorIdsFilter(config, probeResult.actorIds)
      );
      const extractResponse = (await esClient.esql.query(
        { query: extractQuery },
        { ...transportOpts, requestTimeout: EXTRACT_QUERY_TIMEOUT_MS }
      )) as {
        columns: Array<{ name: string; type: string }>;
        values: unknown[][];
      };

      const pageRecords = parseTargetsPerActorRows(
        extractResponse.columns,
        extractResponse.values,
        config,
        logger
      );
      recordsCount += pageRecords.length;
      logger.debug(`[${config.id}] Slice produced ${pageRecords.length} records`);

      // Step 4: Write per-slice. Safe for all current configs because the actor EUID is
      // anchored to host.id: the same actor always maps to the same target, so a plain
      // partial update is idempotent across slices. See TODO above for future IDP configs.
      if (pageRecords.length > 0) {
        const sliceWrite = await writeEntityIds(
          crudClient,
          logger,
          pageRecords,
          esClient,
          namespace,
          config.validateTargetIds
        );

        totalWrite = {
          updated: totalWrite.updated + sliceWrite.updated,
          notFound: totalWrite.notFound + sliceWrite.notFound,
          errors: totalWrite.errors + sliceWrite.errors,
          droppedTargets: totalWrite.droppedTargets + sliceWrite.droppedTargets,
          relationshipTypeApplied: (() => {
            const merged = { ...totalWrite.relationshipTypeApplied };
            for (const [k, v] of Object.entries(sliceWrite.relationshipTypeApplied)) {
              merged[k] = (merged[k] ?? 0) + v;
            }
            return merged;
          })(),
          succeededEntityIds: new Set([
            ...totalWrite.succeededEntityIds,
            ...sliceWrite.succeededEntityIds,
          ]),
        };

        const { validTargetIds, succeededEntityIds } = sliceWrite;
        const actorFilteredRecords = pageRecords.filter(
          (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
        );

        const metadataRecords = validTargetIds
          ? actorFilteredRecords.flatMap((r) => {
              const filteredRels: Record<string, string[]> = {};
              for (const [relType, targetEuids] of Object.entries(r.relationships)) {
                const valid = targetEuids.filter((id) => validTargetIds.has(id));
                if (valid.length > 0) filteredRels[relType] = valid;
              }
              return Object.keys(filteredRels).length > 0
                ? [{ ...r, relationships: filteredRels }]
                : [];
            })
          : actorFilteredRecords;

        const sliceMeta = await writeRelationshipMetadatas(
          entityMetadataClient,
          logger,
          metadataRecords,
          {
            scanId: metadataContext.scanId,
            lookbackWindow: LOOKBACK_WINDOW,
            entitySource: config.id,
            observedAt: metadataContext.observedAt,
          }
        );
        totalMetadata = {
          docsAttempted: totalMetadata.docsAttempted + sliceMeta.docsAttempted,
          docsApplied: totalMetadata.docsApplied + sliceMeta.docsApplied,
        };
      }

      slices++;
      logger.info(
        `[${config.id}] Slice ${slices} complete: ${pageRecords.length} records, actors=${probeResult.actorIds.length}, toDate=${toDate}`
      );

      if (probeResult.isLastSlice) break;

      // Advance past the extract window end (+1ms) so the next probe starts
      // after all events for this slice's actors have been covered.
      sliceStart = new Date(new Date(toDate).getTime() + 1).toISOString();
    }

    if (slices >= MAX_ITERATIONS) {
      truncated = true;
      logger.warn(
        `[${config.id}] Reached MAX_ITERATIONS (${MAX_ITERATIONS}) — stopping early, some actors may be missed`
      );
    }

    const outcome = recordsCount === 0 ? 'empty' : 'producing';
    logger.info(
      `[${config.id}] Integration complete: outcome=${outcome} slices=${slices} records=${recordsCount} written=${totalWrite.updated} notFound=${totalWrite.notFound} errors=${totalWrite.errors} truncated=${truncated}`
    );
    return {
      slices,
      recordsCount,
      write: totalWrite,
      metadata: totalMetadata,
      outcome,
      truncated,
    };
  } catch (err) {
    logger.error(`[${config.id}] Logs integration failed: ${errMsg(err)}`);
    return {
      slices,
      recordsCount,
      write: totalWrite,
      metadata: totalMetadata,
      outcome: 'error',
      truncated: false,
    };
  }
};
