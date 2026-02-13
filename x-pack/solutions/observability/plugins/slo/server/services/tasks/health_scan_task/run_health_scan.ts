/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import { HEALTH_DATA_STREAM_NAME } from '../../../../common/constants';
import type { StoredSLODefinition } from '../../../domain/models';
import { computeHealth } from '../../../domain/services/compute_health';
import { SO_SLO_TYPE } from '../../../saved_objects';
import type { HealthDocument } from './types';

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClient;
  logger: Logger;
  abortController: AbortController;
}

interface RunParams {
  scanId: string;
}

const PER_PAGE = 500;
const BATCH_DELAY_MS = 500;
const MAX_SLOS_PROCESSED = 10_000;

export async function runHealthScan(
  params: RunParams,
  dependencies: Dependencies
): Promise<{ processed: number; problematic: number }> {
  const { scopedClusterClient, soClient, logger } = dependencies;
  const { scanId } = params;

  let totalProcessed = 0;
  let totalProblematic = 0;

  const finder = soClient.createPointInTimeFinder<StoredSLODefinition>({
    type: SO_SLO_TYPE,
    perPage: PER_PAGE,
    namespaces: ['*'],
    fields: ['id', 'revision', 'name', 'enabled'],
  });

  try {
    for await (const response of finder.find()) {
      if (response.saved_objects.length === 0) {
        logger.debug('No more SLOs to process');
        break;
      }

      const sloList = response.saved_objects.map((so) => ({
        id: so.attributes.id,
        revision: so.attributes.revision,
        name: so.attributes.name,
        enabled: so.attributes.enabled,
        spaceId: so.namespaces?.[0] ?? 'default',
      }));
      const sloById = new Map(sloList.map((slo) => [slo.id, slo]));

      const healthResults = await computeHealth(sloList, { scopedClusterClient });

      const now = new Date().toISOString();
      const documents: HealthDocument[] = healthResults.map((result) => ({
        '@timestamp': now,
        scanId,
        spaceId: sloById.get(result.id)?.spaceId ?? 'default',
        slo: {
          id: result.id,
          revision: result.revision,
          name: result.name,
          enabled: sloById.get(result.id)?.enabled ?? true,
        },

        health: result.health,
      }));

      if (documents.length > 0) {
        await bulkInsertHealthDocuments(documents, dependencies);
        totalProcessed += documents.length;
        totalProblematic += documents.filter((doc) => doc.health.isProblematic).length;
      }

      if (totalProcessed >= MAX_SLOS_PROCESSED) {
        logger.debug(`Reached maximum SLOs processed (${MAX_SLOS_PROCESSED}), stopping`);
        break;
      }

      await delay(BATCH_DELAY_MS);
    }
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      logger.debug('Task aborted during execution');
      throw error;
    }
    logger.debug(`Error during health scan: ${error}`);
    throw error;
  } finally {
    await finder.close();
  }

  logger.debug(
    `Health scan completed: ${totalProcessed} processed, ${totalProblematic} problematic`
  );

  return { processed: totalProcessed, problematic: totalProblematic };
}

async function bulkInsertHealthDocuments(
  documents: HealthDocument[],
  dependencies: Dependencies
): Promise<void> {
  const { scopedClusterClient, logger, abortController } = dependencies;
  logger.debug(`Bulk inserting ${documents.length} health documents`);

  const operations = documents.flatMap((doc) => [
    { create: { _index: HEALTH_DATA_STREAM_NAME } },
    doc,
  ]);

  await scopedClusterClient.asInternalUser.bulk(
    { operations, refresh: false },
    { signal: abortController.signal }
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
