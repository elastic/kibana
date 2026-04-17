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
import { INTEGRATION_CONFIGS, type CommunicatesWithIntegrationConfig } from './integrations';
import { postProcessEsqlResults } from './postprocess_records';
import { updateEntityRelationships } from './update_entities';

interface CompositeAggregations {
  users: {
    buckets: CompositeBucket[];
    after_key?: CompositeAfterKey;
  };
}

/** Shape of `esClient.esql.query` JSON until the ES client types expose it. */
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
 * Computes `communicates_with` relationships for user entities by analysing
 * cloud API and MDM activity events across configured integrations.
 *
 * For each integration the flow is:
 *
 * 1. **Discover users** — A paginated composite aggregation scans the
 *    integration's index for events within the lookback window and returns
 *    unique user-identity buckets (up to COMPOSITE_PAGE_SIZE per page).
 *    Both success and failure outcomes are included.
 *
 * 2. **Compute relationships** — An ES|QL query, scoped to the users from
 *    step 1 via a DSL filter, collects the unique target entities each user
 *    communicated with. Targets are stored as EUIDs (e.g. "service:s3.amazonaws.com").
 *
 * 3. **Update relationships** — After all integrations and pages have been
 *    processed, the collected records are written directly to the entity
 *    store's latest entities index via the CRUD bulk update API.
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
  integrations?: CommunicatesWithIntegrationConfig[];
  abortController?: AbortController;
}) {
  let totalBuckets = 0;
  let totalCommunicationRecords = 0;
  let totalUpdated = 0;
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
      const transportOpts = abortController ? { signal: abortController.signal } : undefined;
      try {
        aggResult = await esClient.search(
          {
            index: integration.getIndexPattern(namespace),
            ...integration.buildCompositeAggQuery(afterKey),
          },
          transportOpts
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

      const aggs = aggResult.aggregations as CompositeAggregations | undefined;
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
      logger.info(
        `[${integration.id}] Running ES|QL query for ${buckets.length} user buckets (${esqlQuery.length} chars)`
      );
      logger.debug(`[${integration.id}] ES|QL query:\n${esqlQuery}`);
      logger.debug(`[${integration.id}] Bucket user filter: ${JSON.stringify(bucketFilter)}`);

      let esqlResult;
      try {
        esqlResult = await esClient.esql.query(
          {
            query: esqlQuery,
            filter: esqlFilter,
          },
          transportOpts
        );
      } catch (esqlErr) {
        logger.error(`[${integration.id}] ES|QL query failed: ${errMsg(esqlErr)}`);
        throw esqlErr;
      }

      const { columns, values } = esqlResult as unknown as EsqlQueryResult;

      if (columns && values) {
        const records = postProcessEsqlResults(columns, values, integration.entityType);
        totalCommunicationRecords += records.length;
        allRecords.push(...records);

        for (const record of records) {
          const targets =
            record.communicates_with.ids.length > 0
              ? record.communicates_with.ids.join(', ')
              : 'none';
          logger.debug(`[${integration.id}] Entity ${record.entityId}: targets=[${targets}]`);
        }
      }

      afterKey = buckets.length < COMPOSITE_PAGE_SIZE ? undefined : newAfterKey;
    } while (afterKey);
  }

  if (!abortController?.signal.aborted) {
    totalUpdated = await updateEntityRelationships(crudClient, logger, allRecords);
  } else {
    logger.info('Maintainer run aborted, skipping entity update');
  }

  return {
    totalBuckets,
    totalCommunicationRecords,
    totalUpdated,
    lastRunTimestamp: new Date().toISOString(),
  };
}
