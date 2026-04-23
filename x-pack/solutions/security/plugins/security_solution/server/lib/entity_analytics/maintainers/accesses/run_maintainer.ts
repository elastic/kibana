/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient } from '@kbn/entity-store/server';

import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';
import type { CompositeAfterKey, CompositeBucket, ProcessedEntityRecord } from './types';
import { INTEGRATION_CONFIGS, type AccessesIntegrationConfig } from './integrations';
import { postprocessEsqlResults } from './postprocess_records';
import { updateEntityRelationships } from './update_entities';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIndexNotFound(err: any): boolean {
  const type = err?.meta?.body?.error?.type ?? err?.body?.error?.type ?? '';
  return type === 'index_not_found_exception';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errMsg(err: any): string {
  return err?.message ?? JSON.stringify(err);
}

/**
 * Computes `accesses_frequently` and `accesses_infrequently` relationships for
 * user entities by analysing authentication events across configured integrations.
 *
 * For each integration the flow is:
 *
 * 1. **Discover users** — A paginated composite aggregation scans the
 *    integration's index for successful logon events within the lookback window
 *    and returns unique user-identity buckets (up to COMPOSITE_PAGE_SIZE per page).
 *
 * 2. **Classify access patterns** — An ES|QL query, scoped to the users from
 *    step 1 via a DSL filter, counts how many times each user accessed each
 *    host. Hosts accessed more than 4 times are labelled `accesses_frequently`;
 *    the rest are labelled `accesses_infrequently`.
 *
 * 3. **Upsert relationships** — After all integrations and pages have been
 *    processed, the accumulated records are written to the entity store's
 *    updates data stream so the extraction pipeline can merge them into the
 *    latest entities index.
 */
export async function runMaintainer({
  esClient,
  logger,
  namespace,
  crudClient,
  integrations = INTEGRATION_CONFIGS,
  abortController,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  crudClient: EntityUpdateClient;
  integrations?: AccessesIntegrationConfig[];
  abortController?: AbortController;
}) {
  let totalBuckets = 0;
  let totalAccessRecords = 0;
  let totalUpserted = 0;
  const allRecords: ProcessedEntityRecord[] = [];

  for (const integration of integrations) {
    if (abortController?.signal.aborted) {
      logger.info('Maintainer run aborted, skipping remaining integrations');
      break;
    }
    logger.info(`[${integration.id}] Processing integration: ${integration.name}`);

    let afterKey: CompositeAfterKey | undefined;
    let iterations = 0;

    do {
      if (abortController?.signal.aborted) {
        logger.info(`[${integration.id}] Maintainer run aborted during pagination`);
        break;
      }
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        logger.warn(
          `[${integration.id}] Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping pagination`
        );
        break;
      }
      logger.info(
        `[${integration.id}] Running composite aggregation (afterKey: ${JSON.stringify(
          afterKey ?? 'none'
        )})`
      );

      let aggResult;
      try {
        aggResult = await esClient.search(
          {
            index: integration.getIndexPattern(namespace),
            ...integration.buildCompositeAggQuery(afterKey),
          },
          abortController ? { signal: abortController.signal } : undefined
        );
      } catch (err) {
        if (isIndexNotFound(err)) {
          const idx = integration.getIndexPattern(namespace);
          logger.info(`[${integration.id}] Index "${idx}" not found, skipping`);
          break;
        }
        logger.error(`[${integration.id}] Composite aggregation failed: ${errMsg(err)}`);
        throw err;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aggs = aggResult.aggregations as any;
      const buckets: CompositeBucket[] = aggs?.users?.buckets ?? [];
      const newAfterKey: CompositeAfterKey | undefined = aggs?.users?.after_key;

      logger.info(`[${integration.id}] Found ${buckets.length} user buckets`);
      totalBuckets += buckets.length;

      if (buckets.length === 0) break;

      const bucketFilter = integration.buildBucketUserFilter(buckets);
      const esqlFilter = {
        bool: {
          filter: [{ range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } }, bucketFilter],
        },
      };

      const esqlQuery = integration.buildEsqlQuery(namespace);
      logger.debug(`[${integration.id}] Bucket user filter: ${JSON.stringify(bucketFilter)}`);

      let esqlResult;
      try {
        esqlResult = await esClient.esql.query(
          {
            query: esqlQuery,
            filter: esqlFilter,
          },
          abortController ? { signal: abortController.signal } : undefined
        );
      } catch (err) {
        // Break instead of rethrowing so a failure on one integration's ES|QL
        // query only skips the rest of that integration's pages, allowing the
        // outer loop to continue processing the remaining integrations.
        logger.error(`[${integration.id}] ES|QL query failed: ${errMsg(err)}`);
        break;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columns = (esqlResult as any).columns as Array<{ name: string; type: string }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values = (esqlResult as any).values as unknown[][];

      if (columns && values) {
        const records = postprocessEsqlResults(columns, values);
        totalAccessRecords += records.length;
        allRecords.push(...records);

        for (const record of records) {
          const freq =
            record.accesses_frequently.ids.length > 0
              ? record.accesses_frequently.ids.join(', ')
              : 'none';
          const infreq =
            record.accesses_infrequently.ids.length > 0
              ? record.accesses_infrequently.ids.join(', ')
              : 'none';
          logger.info(
            `[${integration.id}] Entity ${record.entityId}: frequently=[${freq}], infrequently=[${infreq}]`
          );
        }
      }

      afterKey = buckets.length < COMPOSITE_PAGE_SIZE ? undefined : newAfterKey;
    } while (afterKey);
  }

  if (!abortController?.signal.aborted) {
    totalUpserted = await updateEntityRelationships(crudClient, logger, allRecords);
  } else {
    logger.info('Maintainer run aborted, skipping entity update');
  }

  return {
    totalBuckets,
    totalAccessRecords,
    totalUpserted,
    lastRunTimestamp: new Date().toISOString(),
  };
}
