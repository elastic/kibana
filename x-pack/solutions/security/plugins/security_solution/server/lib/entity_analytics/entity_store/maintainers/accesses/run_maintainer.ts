/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityMaintainerState } from '@kbn/entity-store/server';

import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';
import type { CompositeAfterKey, CompositeBucket, ProcessedEntityRecord } from './types';
import { INTEGRATION_CONFIGS, type AccessesIntegrationConfig } from './integrations';
import { postprocessEsqlResults } from './postprocess_records';
import { upsertEntityRelationships } from './upsert_entities';

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
 *    If the index lacks `*.entity.id` fields the query is automatically retried
 *    without those fields (verification_exception fallback).
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
  integrations = INTEGRATION_CONFIGS,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  integrations?: AccessesIntegrationConfig[];
}): Promise<EntityMaintainerState> {
  let totalBuckets = 0;
  let totalAccessRecords = 0;
  let totalUpserted = 0;
  const allRecords: ProcessedEntityRecord[] = [];

  for (const integration of integrations) {
    logger.info(`[${integration.id}] Processing integration: ${integration.name}`);

    let afterKey: CompositeAfterKey | undefined;
    let iterations = 0;
    let skipEntityFields = false;

    do {
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

      const aggResult = await esClient
        .search({
          index: integration.getIndexPattern(namespace),
          ...integration.buildCompositeAggQuery(afterKey),
        })
        .catch((err) => {
          logger.error(
            `[${integration.id}] Composite aggregation failed: ${
              err?.message ?? JSON.stringify(err)
            }`
          );
          throw err;
        });

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

      let esqlQuery = integration.buildEsqlQuery(namespace, skipEntityFields);
      logger.info(
        `[${integration.id}] Running ES|QL query (skipEntityFields=${skipEntityFields}):\n${esqlQuery}`
      );
      logger.info(`[${integration.id}] Bucket user filter: ${JSON.stringify(bucketFilter)}`);

      let esqlResult;
      try {
        esqlResult = await esClient.esql.query({ query: esqlQuery, filter: esqlFilter });
      } catch (err) {
        const isVerificationException =
          err?.meta?.body?.error?.type === 'verification_exception' ||
          err?.message?.includes('verification_exception');

        if (isVerificationException && !skipEntityFields) {
          logger.warn(
            `[${integration.id}] ES|QL query failed with verification_exception ` +
              '(likely missing *.entity.id fields). Retrying without entity fields.'
          );
          skipEntityFields = true;
          esqlQuery = integration.buildEsqlQuery(namespace, skipEntityFields);
          logger.info(
            `[${integration.id}] Retry ES|QL query (skipEntityFields=${skipEntityFields}):\n${esqlQuery}`
          );
          esqlResult = await esClient.esql.query({ query: esqlQuery, filter: esqlFilter });
        } else {
          logger.error(
            `[${integration.id}] ES|QL query failed: ${err?.message ?? JSON.stringify(err)}`
          );
          throw err;
        }
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
            record.accesses_frequently.length > 0 ? record.accesses_frequently.join(', ') : 'none';
          const infreq =
            record.accesses_infrequently.length > 0
              ? record.accesses_infrequently.join(', ')
              : 'none';
          logger.info(
            `[${integration.id}] Entity ${record.entityId}: frequently=[${freq}], infrequently=[${infreq}]`
          );
        }
      }

      afterKey = buckets.length < COMPOSITE_PAGE_SIZE ? undefined : newAfterKey;
    } while (afterKey);
  }

  totalUpserted = await upsertEntityRelationships(esClient, logger, namespace, allRecords);

  return {
    totalBuckets,
    totalAccessRecords,
    totalUpserted,
    lastRunTimestamp: new Date().toISOString(),
  };
}
