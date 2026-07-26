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
import { COMPOSITE_PAGE_SIZE, LOOKBACK_WINDOW } from './constants';
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

function mergeWriteResult(a: WriteEntityIdsResult, b: WriteEntityIdsResult): WriteEntityIdsResult {
  const relationshipTypeApplied = { ...a.relationshipTypeApplied };
  for (const [key, count] of Object.entries(b.relationshipTypeApplied)) {
    relationshipTypeApplied[key] = (relationshipTypeApplied[key] ?? 0) + count;
  }
  return {
    updated: a.updated + b.updated,
    notFound: a.notFound + b.notFound,
    errors: a.errors + b.errors,
    droppedTargets: a.droppedTargets + b.droppedTargets,
    relationshipTypeApplied,
    validTargetIds: undefined, // not tracked across slices
    succeededEntityIds: new Set([...a.succeededEntityIds, ...b.succeededEntityIds]),
  };
}

function mergeMetadataResult(
  a: WriteRelationshipMetadatasResult,
  b: WriteRelationshipMetadatasResult
): WriteRelationshipMetadatasResult {
  return {
    docsAttempted: a.docsAttempted + b.docsAttempted,
    docsApplied: a.docsApplied + b.docsApplied,
  };
}

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
  let totalWrite = ZERO_WRITE;
  let totalMetadata = ZERO_METADATA;

  // LOOKBACK_WINDOW is an ES date math expression ('now-30d'), not a parseable ISO timestamp.
  // Compute the actual 30-day-ago ISO string once so subsequent +1ms slice advances work correctly.
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let sliceStart = new Date(Date.now() - thirtyDaysMs).toISOString();

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

      // Step 1: Probe — find the time boundary covering ~maxActors distinct actors
      const probeQuery = buildActorSliceProbeQuery(config, namespace, sliceStart);
      const probeResponse = (await esClient.esql.query({ query: probeQuery }, transportOpts)) as {
        columns: Array<{ name: string; type: string }>;
        values: unknown[][];
      };

      const probeResult = parseActorSliceProbeResult(
        probeResponse.columns,
        probeResponse.values,
        maxActors
      );

      if (probeResult.sliceBoundary === null) {
        // No actors found — nothing left to process
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
        transportOpts
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

      // Step 4: Write — persist relationships and metadata for this slice
      if (pageRecords.length > 0) {
        const write = await writeEntityIds(
          crudClient,
          logger,
          pageRecords,
          esClient,
          namespace,
          config.validateTargetIds
        );
        totalWrite = mergeWriteResult(totalWrite, write);

        const { validTargetIds, succeededEntityIds } = write;
        const actorFilteredRecords = pageRecords.filter(
          (r) => r.entityId !== null && succeededEntityIds.has(r.entityId)
        );

        // When target validation also ran, further restrict to the validated target set.
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

        const metadata = await writeRelationshipMetadatas(
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
        totalMetadata = mergeMetadataResult(totalMetadata, metadata);
      }

      slices++;
      logger.info(
        `[${config.id}] Slice ${slices} complete: ${pageRecords.length} records, toDate=${toDate}`
      );

      if (probeResult.isLastSlice) break;

      // Advance the window start by +1ms to avoid re-processing the boundary event
      sliceStart = new Date(new Date(toDate).getTime() + 1).toISOString();
    }

    return {
      slices,
      recordsCount,
      write: totalWrite,
      metadata: totalMetadata,
      outcome: recordsCount === 0 ? 'empty' : 'producing',
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
