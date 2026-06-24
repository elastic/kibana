/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { runRelationshipMaintainer } from '../engine/run_relationship_maintainer';
import { buildAdministersConfigs } from './configs';

export const administersMaintainer: RegisterEntityMaintainerConfig = {
  id: 'administers',
  description:
    'Resolves administers relationships from raw_identifiers on entity documents ' +
    '(Active Directory: user → host and host → host via managedObjects)',
  interval: '1d',
  timeout: '1h',
  initialState: {},
  run: async ({ esClient, logger, status, crudClient, abortController }) => {
    const namespace = status.metadata.namespace;
    const lastProcessedTimestamp =
      typeof status.state.lastProcessedTimestamp === 'string'
        ? status.state.lastProcessedTimestamp
        : undefined;

    if (lastProcessedTimestamp) {
      logger.info(
        `Starting administers maintainer run (incremental from ${lastProcessedTimestamp})`
      );
    } else {
      logger.info('Starting administers maintainer run (full scan — first run)');
    }

    const result = await runRelationshipMaintainer({
      esClient,
      logger,
      namespace,
      crudClient,
      integrations: buildAdministersConfigs(lastProcessedTimestamp),
      abortController,
    });

    logger.info(
      `Completed run: ${result.totalBuckets} buckets, ${result.totalRecords} records, ${result.totalWritten} entities written`
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
