/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import { discoverExitSpans } from './discover_exit_spans';
import { resolveDownstreamServices } from './resolve_downstream_services';
import { writeDependencyEdges } from './write_dependency_edges';
import { writeRelationshipMetadata } from './write_relationship_metadata';

/**
 * Derives service → service `depends_on` edges from APM exit spans.
 *
 * On each interval:
 *   1. Discover (sourceService, exitResource, [spanId…]) pairs from APM span docs
 *   2. Resolve spanIds → downstream service.name via parent.id join on transactions
 *   3. Write entity.relationships.depends_on.* onto each source service entity
 *   4. Append relationship_observed docs to the entity metadata data stream
 *
 * This pre-computes edges so the service-map read is a single cheap aggregation,
 * replacing APM's 5-query, per-request, sampled pipeline.
 */
export const serviceDependenciesMaintainer: RegisterEntityMaintainerConfig = {
  id: 'service-dependencies',
  description: 'Derives service→service depends_on edges from APM exit spans',
  interval: '10m',
  timeout: '9m',
  initialState: { lastProcessedTimestamp: null },

  run: async ({
    esClient,
    crudClient,
    entityMetadataClient,
    logger,
    status,
    signal,
    telemetry,
  }) => {
    const namespace = status.metadata.namespace;
    const runStartedAt = new Date().toISOString();
    logger.info(`[service-dependencies] Starting run in namespace: ${namespace}`);

    // -------------------------------------------------------------------------
    // Phase 1: Discover exit spans in the time window
    // -------------------------------------------------------------------------
    /**
     * Use a fixed sliding lookback rather than a watermark-chained window so that
     * late-arriving data (ingest lag, bulk loads) is always re-scanned.
     *
     * A watermark-chained window permanently drops any span whose @timestamp falls
     * inside a past window that had already been committed but the doc hadn't yet
     * become searchable at query time (ES refresh + APM agent flush latency is
     * typically 10-230 s). Sliding windows trade some redundant work for correctness;
     * that's safe because `depends_on.ids` is a collectValues/union-merge field.
     */
    const LOOKBACK_WINDOW_MS = 60 * 60 * 1000; // 1 hour
    const LOOKBACK_WINDOW_LABEL = '1h'; // must match human-readable form of LOOKBACK_WINDOW_MS
    const windowEnd = runStartedAt;
    const windowStart = new Date(Date.parse(runStartedAt) - LOOKBACK_WINDOW_MS).toISOString();

    // Derive a per-run seed from the run timestamp epoch so successive runs sample
    // different spans while paging within a single run stays self-consistent.
    const randomSeed = Date.parse(runStartedAt);

    const exitSpans = await discoverExitSpans({
      esClient,
      windowStart,
      windowEnd,
      randomSeed,
      logger,
    });
    logger.info(`[service-dependencies] Discovered ${exitSpans.length} exit span pairs`);

    if (signal.aborted) return status.state;

    // -------------------------------------------------------------------------
    // Phase 2: Resolve exit spans → downstream service names
    // -------------------------------------------------------------------------
    const resolved = await resolveDownstreamServices({
      esClient,
      exitSpans,
      windowStart,
      windowEnd,
      logger,
    });

    if (signal.aborted) return status.state;

    // -------------------------------------------------------------------------
    // Phase 3: Write entity.relationships.depends_on.* onto source service docs
    // -------------------------------------------------------------------------
    let scanned = 0;
    let qualified = 0;
    let applied = 0;
    let failed = 0;

    const { succeededEntityIds, failed: writeFailed } = await writeDependencyEdges({
      crudClient,
      resolved,
      logger,
    });

    scanned = resolved.size;
    qualified = resolveNonEmpty(resolved);
    applied = succeededEntityIds.size;
    failed = writeFailed;

    if (signal.aborted) return status.state;

    // -------------------------------------------------------------------------
    // Phase 4: Append relationship_observed docs to the metadata data stream
    //          Only for source entities that were successfully updated (phase 3)
    // -------------------------------------------------------------------------
    const metadataWritten = await writeRelationshipMetadata({
      entityMetadataClient,
      resolved,
      succeededEntityIds,
      runStartedAt,
      lookbackWindow: LOOKBACK_WINDOW_LABEL,
      logger,
    });

    logger.info(
      `[service-dependencies] Run complete: scanned=${scanned} qualified=${qualified} applied=${applied} failed=${failed} metadataWritten=${metadataWritten}`
    );

    telemetry.report({ funnel: { scanned, qualified, applied, failed } });

    // Advance the watermark only when not aborted
    return { lastProcessedTimestamp: windowEnd };
  },
};

/**
 * Count source services that have at least one resolved downstream service target.
 * (Unresolved-only resources still appear on the map as backend nodes but are not
 * counted as "qualified" for parity with the previous telemetry meaning.)
 */
const resolveNonEmpty = (resolved: Map<string, { resources: Array<{ targets: string[] }> }>) => {
  let count = 0;
  for (const { resources } of resolved.values()) {
    if (resources.some((r) => r.targets.length > 0)) count++;
  }
  return count;
};
