/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { keyBy } from 'lodash';
import {
  HEALTH_DATA_STREAM_NAME,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../../../common/constants';
import { computeHealth } from '../../../domain/services/compute_health';
import type { HealthDocument, SLO } from './types';

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
  abortController: AbortController;
}

interface RunParams {
  scanId: string;
}

const COMPOSITE_BATCH_SIZE = 500;
const BATCH_DELAY_MS = 500;
const MAX_BATCHES = 100;
const MAX_SLOS_PROCESSED = 10_000;

export async function runHealthScan(
  params: RunParams,
  dependencies: Dependencies
): Promise<{ processed: number; problematic: number }> {
  const { scopedClusterClient, logger } = dependencies;
  const { scanId } = params;

  let searchAfter: AggregationsCompositeAggregateKey | undefined;
  let totalProcessed = 0;
  let totalProblematic = 0;
  let batchCount = 0;

  try {
    do {
      batchCount++;
      logger.debug(`Processing batch ${batchCount}`);

      const { list, nextSearchAfter } = await fetchUniqueSloFromSummary(searchAfter, dependencies);
      searchAfter = nextSearchAfter;

      if (list.length === 0) {
        logger.debug('No more SLOs to process');
        break;
      }

      const listById = keyBy(list, (slo) => slo.id);

      const healthResults = await computeHealth(
        list.map((slo) => ({
          id: slo.id,
          revision: slo.revision,
          name: `SLO ${slo.id}`, // We don't have the name, using placeholder
          enabled: true, // Assume enabled for health check
        })),
        { scopedClusterClient }
      );

      const now = new Date().toISOString();
      const documents: HealthDocument[] = healthResults.map((result) => ({
        '@timestamp': now,
        scanId,
        spaceId: listById[result.id]?.spaceId ?? 'default',
        sloId: result.id,
        revision: result.revision,
        isProblematic: result.health.isProblematic,
        health: result.health,
      }));

      if (documents.length > 0) {
        await bulkInsertHealthDocuments(documents, dependencies);
        totalProcessed += documents.length;
        totalProblematic += documents.filter((doc) => doc.isProblematic).length;
      }

      if (searchAfter) {
        await delay(BATCH_DELAY_MS);
      }

      if (batchCount >= MAX_BATCHES) {
        logger.debug(`Reached maximum number of batches (${MAX_BATCHES}), stopping`);
        break;
      }

      if (totalProcessed >= MAX_SLOS_PROCESSED) {
        logger.debug(`Reached maximum SLOs processed (${MAX_SLOS_PROCESSED}), stopping`);
        break;
      }
    } while (searchAfter);
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      logger.debug('Task aborted during execution');
      throw error;
    }
    logger.debug(`Error during health scan: ${error}`);
    throw error;
  }

  logger.debug(
    `Health scan completed: ${totalProcessed} processed, ${totalProblematic} problematic`
  );

  return { processed: totalProcessed, problematic: totalProblematic };
}

async function fetchUniqueSloFromSummary(
  searchAfter: AggregationsCompositeAggregateKey | undefined,
  dependencies: Dependencies
): Promise<{
  nextSearchAfter: AggregationsCompositeAggregateKey | undefined;
  list: SLO[];
}> {
  const { logger, scopedClusterClient, abortController } = dependencies;
  logger.debug(
    `Fetching unique SLO (id, revision) tuples from summary index after ${JSON.stringify(
      searchAfter
    )}`
  );

  const result = await scopedClusterClient.asInternalUser.search<
    unknown,
    {
      id_revision: {
        after_key: AggregationsCompositeAggregateKey;
        buckets: Array<{
          key: {
            spaceId: string;
            id: string;
            revision: number;
          };
        }>;
      };
    }
  >(
    {
      size: 0,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      aggs: {
        id_revision: {
          composite: {
            size: COMPOSITE_BATCH_SIZE,
            sources: [
              {
                spaceId: {
                  terms: {
                    field: 'spaceId',
                  },
                },
              },
              {
                id: {
                  terms: {
                    field: 'slo.id',
                  },
                },
              },
              {
                revision: {
                  terms: {
                    field: 'slo.revision',
                  },
                },
              },
            ],
            after: searchAfter,
          },
        },
      },
    },
    { signal: abortController.signal }
  );

  const buckets = result.aggregations?.id_revision.buckets ?? [];
  if (buckets.length === 0) {
    return {
      nextSearchAfter: undefined,
      list: [],
    };
  }

  return {
    nextSearchAfter:
      buckets.length < COMPOSITE_BATCH_SIZE
        ? undefined
        : result.aggregations?.id_revision.after_key,
    list: buckets.map(({ key }) => ({
      spaceId: String(key.spaceId),
      id: String(key.id),
      revision: Number(key.revision),
    })),
  };
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
