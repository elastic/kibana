/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityMaintainerState } from '@kbn/entity-store/server';

import { getIndexPattern, LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';
import type { CompositeAfterKey, CompositeBucket, ProcessedEntityRecord } from './types';
import { buildCompositeAggQuery, buildBucketUserFilter } from './build_composite_agg';
import { buildEsqlQuery } from './build_esql_query';
import { postprocessEsqlResults } from './postprocess_records';
import { upsertEntityRelationships } from './upsert_entities';

export async function runMaintainer({
  esClient,
  logger,
  namespace,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}): Promise<EntityMaintainerState> {
  let afterKey: CompositeAfterKey | undefined;
  let totalBuckets = 0;
  let totalAccessRecords = 0;
  let totalUpserted = 0;
  let iterations = 0;
  let skipEntityFields = false;
  const allRecords: ProcessedEntityRecord[] = [];

  do {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      logger.warn(`Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping pagination`);
      break;
    }
    logger.info(`Running composite aggregation (afterKey: ${JSON.stringify(afterKey ?? 'none')})`);

    const aggResult = await esClient
      .search({
        index: getIndexPattern(namespace),
        ...buildCompositeAggQuery(afterKey),
      })
      .catch((err) => {
        logger.error(`Composite aggregation failed: ${err?.message ?? JSON.stringify(err)}`);
        throw err;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggs = aggResult.aggregations as any;
    const buckets: CompositeBucket[] = aggs?.users?.buckets ?? [];
    const newAfterKey: CompositeAfterKey | undefined = aggs?.users?.after_key;

    logger.info(`Found ${buckets.length} user buckets`);
    totalBuckets += buckets.length;

    if (buckets.length === 0) break;

    const bucketFilter = buildBucketUserFilter(buckets);
    const esqlFilter = {
      bool: {
        filter: [{ range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } }, bucketFilter],
      },
    };

    let esqlQuery = buildEsqlQuery(namespace, skipEntityFields);
    logger.info(`Running ES|QL query (skipEntityFields=${skipEntityFields}):\n${esqlQuery}`);
    logger.info(`Bucket user filter: ${JSON.stringify(bucketFilter)}`);

    let esqlResult;
    try {
      esqlResult = await esClient.esql.query({ query: esqlQuery, filter: esqlFilter });
    } catch (err) {
      const isVerificationException =
        err?.meta?.body?.error?.type === 'verification_exception' ||
        err?.message?.includes('verification_exception');

      if (isVerificationException && !skipEntityFields) {
        logger.warn(
          'ES|QL query failed with verification_exception (likely missing *.entity.id fields). ' +
            'Retrying without entity fields.'
        );
        skipEntityFields = true;
        esqlQuery = buildEsqlQuery(namespace, skipEntityFields);
        logger.info(`Retry ES|QL query (skipEntityFields=${skipEntityFields}):\n${esqlQuery}`);
        esqlResult = await esClient.esql.query({ query: esqlQuery, filter: esqlFilter });
      } else {
        logger.error(`ES|QL query failed: ${err?.message ?? JSON.stringify(err)}`);
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
        logger.info(`Entity ${record.entityId}: frequently=[${freq}], infrequently=[${infreq}]`);
      }
    }

    afterKey = buckets.length < COMPOSITE_PAGE_SIZE ? undefined : newAfterKey;
  } while (afterKey);

  totalUpserted = await upsertEntityRelationships(esClient, logger, namespace, allRecords);

  return {
    totalBuckets,
    totalAccessRecords,
    totalUpserted,
    lastRunTimestamp: new Date().toISOString(),
  };
}
