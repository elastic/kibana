/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient } from '@kbn/entity-store/server';

import type { RelationshipIntegrationConfig, CompositeAfterKey, CompositeBucket, ProcessedEngineRecord } from './types';
import { buildCompositeAgg, buildBucketFilter } from './build_composite_agg';
import { buildEsqlQuery } from './build_esql_query';
import { postprocessEsqlResults } from './postprocess_records';
import { writeRawIdentifiers } from './update_entities';
import { LOOKBACK_WINDOW, COMPOSITE_PAGE_SIZE, MAX_ITERATIONS } from './constants';

interface CompositeAggregations {
  users: {
    buckets: CompositeBucket[];
    after_key?: CompositeAfterKey;
  };
}

interface EsqlQueryResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

function isIndexNotFound(err: unknown): boolean {
  const e = err as {
    meta?: { body?: { error?: { type?: string } } };
    body?: { error?: { type?: string } };
  };
  return (e?.meta?.body?.error?.type ?? e?.body?.error?.type) === 'index_not_found_exception';
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

/**
 * Generic run loop for relationship maintainers.
 * Iterates over the provided integration configs and runs the composite agg +
 * ES|QL pipeline for each, collecting ProcessedEngineRecord objects.
 * After all integrations complete, writes raw_identifiers to entity documents.
 *
 * The relationship resolver in the entity_store plugin later validates those
 * raw entity.ids and promotes confirmed ones to ids.
 */
export const runGenericMaintainer = async ({
  esClient,
  logger,
  namespace,
  crudClient,
  integrations,
  abortController,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  crudClient: EntityUpdateClient;
  integrations: RelationshipIntegrationConfig[];
  abortController?: AbortController;
}): Promise<{
  totalBuckets: number;
  totalRecords: number;
  totalWritten: number;
  lastRunTimestamp: string;
}> => {
  let totalBuckets = 0;
  let totalRecords = 0;
  let totalWritten = 0;
  const allRecords: ProcessedEngineRecord[] = [];

  for (const config of integrations) {
    if (abortController?.signal.aborted) {
      logger.info('Generic maintainer aborted, skipping remaining integrations');
      break;
    }
    logger.info(`[${config.id}] Processing integration: ${config.name}`);

    let afterKey: CompositeAfterKey | undefined;
    let iterations = 0;

    do {
      if (abortController?.signal.aborted) {
        logger.info(`[${config.id}] Aborted during pagination`);
        break;
      }
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        logger.warn(`[${config.id}] Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping`);
        break;
      }

      const transportOpts = abortController ? { signal: abortController.signal } : undefined;

      let aggResult;
      try {
        aggResult = await esClient.search(
          {
            index: config.indexPattern(namespace),
            ...buildCompositeAgg(config, afterKey),
          },
          transportOpts
        );
      } catch (err) {
        if (isIndexNotFound(err)) {
          logger.info(`[${config.id}] Index "${config.indexPattern(namespace)}" not found, skipping`);
          break;
        }
        logger.error(`[${config.id}] Composite aggregation failed: ${errMsg(err)}`);
        throw err;
      }

      const aggs = aggResult.aggregations as CompositeAggregations | undefined;
      const buckets: CompositeBucket[] = aggs?.users?.buckets ?? [];
      const newAfterKey: CompositeAfterKey | undefined = aggs?.users?.after_key;

      logger.info(`[${config.id}] Found ${buckets.length} user buckets`);
      totalBuckets += buckets.length;

      if (buckets.length === 0) break;

      const bucketFilter = buildBucketFilter(config, buckets);
      const esqlFilter = {
        bool: {
          filter: [{ range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } }, bucketFilter],
        },
      };

      const esqlQuery = buildEsqlQuery(config, namespace);

      let esqlResult;
      try {
        esqlResult = await esClient.esql.query({ query: esqlQuery, filter: esqlFilter }, transportOpts);
      } catch (err) {
        logger.error(`[${config.id}] ES|QL query failed: ${errMsg(err)}`);
        break;
      }

      const { columns, values } = esqlResult as unknown as EsqlQueryResult;
      if (columns && values) {
        const records = postprocessEsqlResults(columns, values, config.relationshipType);
        totalRecords += records.length;
        allRecords.push(...records);
        logger.debug(`[${config.id}] Produced ${records.length} records`);
      }

      afterKey = buckets.length < COMPOSITE_PAGE_SIZE ? undefined : newAfterKey;
    } while (afterKey);
  }

  if (!abortController?.signal.aborted) {
    totalWritten = await writeRawIdentifiers(crudClient, logger, allRecords);
  } else {
    logger.info('Generic maintainer aborted, skipping entity write');
  }

  return { totalBuckets, totalRecords, totalWritten, lastRunTimestamp: new Date().toISOString() };
};
