/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { runRelationshipMaintainer } from '../engine/run_relationship_maintainer';
import type { RelationshipMaintainerTelemetryCollector } from '../types';
import { buildSupervisesConfigs } from './configs';

export const supervisesMaintainer: RegisterEntityMaintainerConfig = {
  id: 'supervises',
  description:
    'Resolves supervises (user → user) relationships from raw_identifiers on entity documents',
  interval: '1d',
  timeout: '1h',
  initialState: {},
  run: async ({ esClient, logger, status, crudClient, abortController, telemetry }) => {
    const namespace = status.metadata.namespace;
    const lastProcessedTimestamp =
      typeof status.state.lastProcessedTimestamp === 'string'
        ? status.state.lastProcessedTimestamp
        : undefined;

    if (lastProcessedTimestamp) {
      logger.info(
        `Starting supervises maintainer run (incremental from ${lastProcessedTimestamp})`
      );
    } else {
      logger.info('Starting supervises maintainer run (full scan — first run)');
    }

    const collector: RelationshipMaintainerTelemetryCollector = {
      sources: [],
      relationshipTypeApplied: {},
    };

    const result = await runRelationshipMaintainer({
      esClient,
      logger,
      namespace,
      crudClient,
      integrations: buildSupervisesConfigs(lastProcessedTimestamp),
      abortController,
      telemetryCollector: collector,
    });

    telemetry.report({
      iterations: result.totalIterations,
      truncated: result.truncated,
      funnel: {
        scanned: result.totalBuckets,
        qualified: result.totalRecords,
        proposed: result.totalRecords,
        applied: result.totalWritten,
        droppedNotInStore: result.totalNotFound,
        failed: result.totalWriteErrors,
        // TODO: extend telemetry schema to include droppedTargets (phantom ID validation)
      },
      sources: collector.sources,
      ...(Object.keys(collector.relationshipTypeApplied).length > 0 && {
        breakdown: Object.entries(collector.relationshipTypeApplied).map(([name, count]) => ({
          name,
          count,
        })),
      }),
    });

    logger.info(
      `Completed run: ${result.totalBuckets} buckets, ${result.totalRecords} records, ${result.totalWritten} entities written, ${result.totalDroppedTargets} targets dropped`
    );

    // Do not advance the watermark if the run was aborted — the next run should
    // re-process the same window to avoid missing entities.
    if (abortController.signal.aborted) {
      logger.info('Run was aborted; watermark not advanced');
      return status.state;
    }

    return {
      ...result,
      lastProcessedTimestamp: result.lastRunTimestamp,
    };
  },
};
