/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, EntityMetadataClient } from '@kbn/entity-store/server';

import type { RelationshipIntegrationConfig, EntityRelationshipRecord } from './types';
import {
  COMPOSITE_PAGE_SIZE,
  EXTRACT_QUERY_TIMEOUT_MS,
  LOOKBACK_WINDOW,
  LOOKBACK_WINDOW_MS,
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
  truncated: false;
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
  let totalWrite: WriteEntityIdsResult = ZERO_WRITE;
  let totalMetadata: WriteRelationshipMetadatasResult = ZERO_METADATA;

  // Accumulates records across all slices before a single end-of-run write.
  // An actor with events on day 1 and day 30 will appear in two separate slices;
  // writing per-slice would overwrite the earlier slice's relationships (bulkUpdateEntity
  // does a plain doc partial update, not a merge). Accumulating here ensures each actor's
  // full 30-day relationship set is written in one call.
  const accumulated = new Map<string, EntityRelationshipRecord>();

  // LOOKBACK_WINDOW is ES date math ('now-30d') and cannot be parsed as ISO.
  // Use LOOKBACK_WINDOW_MS for JS Date arithmetic so +1ms slice advances work correctly.
  let sliceStart = new Date(Date.now() - LOOKBACK_WINDOW_MS).toISOString();

  try {
    while (true) {
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
        // No actors found even without sampling — nothing left to process
        logger.info(`[${config.id}] No actors found in probe, finishing`);
        return {
          slices,
          recordsCount,
          write: totalWrite,
          metadata: totalMetadata,
          outcome: slices === 0 ? 'empty' : 'producing',
          truncated: false,
        };
      }

      // Step 2: Extend (boundary query) — skip for last slice, use 'now' as the upper bound
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

      // Step 3: Extract — collect actor→target relationships within the slice window
      const extractQuery = buildTargetsPerActorQuery(config, namespace, {
        fromDate: sliceStart,
        toDate,
      });
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

      // Step 4: Accumulate — merge this slice's records into the cross-slice map.
      // We do not write here because the same actor can appear in multiple slices
      // (events on day 1 and day 30 land in different time windows). Writing per-slice
      // would overwrite earlier relationship sets; accumulating ensures a single write
      // per actor with their full 30-day relationship set.
      for (const record of pageRecords) {
        const { entityId } = record;
        if (entityId !== null) {
          const existing = accumulated.get(entityId);
          if (!existing) {
            accumulated.set(entityId, { ...record, relationships: { ...record.relationships } });
          } else {
            for (const [relType, targets] of Object.entries(record.relationships)) {
              const merged = new Set(existing.relationships[relType] ?? []);
              for (const t of targets) merged.add(t);
              existing.relationships[relType] = Array.from(merged);
            }
          }
        }
      }

      slices++;
      logger.info(
        `[${config.id}] Slice ${slices} complete: ${pageRecords.length} records, toDate=${toDate}`
      );

      if (probeResult.isLastSlice) break;

      // Advance the window start by +1ms to avoid re-processing the boundary event
      sliceStart = new Date(new Date(toDate).getTime() + 1).toISOString();
    }

    // Step 5: Write — single pass over all accumulated records after all slices are processed.
    const allRecords = Array.from(accumulated.values());

    if (allRecords.length > 0) {
      const write = await writeEntityIds(
        crudClient,
        logger,
        allRecords,
        esClient,
        namespace,
        config.validateTargetIds
      );
      totalWrite = write;

      const { validTargetIds, succeededEntityIds } = write;
      const actorFilteredRecords = allRecords.filter(
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

      totalMetadata = await writeRelationshipMetadatas(
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
    }

    const outcome = recordsCount === 0 ? 'empty' : 'producing';
    logger.info(
      `[${config.id}] Integration complete: outcome=${outcome} slices=${slices} records=${recordsCount} written=${totalWrite.updated} notFound=${totalWrite.notFound} errors=${totalWrite.errors}`
    );
    return {
      slices,
      recordsCount,
      write: totalWrite,
      metadata: totalMetadata,
      outcome,
      truncated: false,
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
