/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient } from '@kbn/entity-store/server';

import type {
  RelationshipIntegrationConfig,
  CompositeAfterKey,
  CompositeBucket,
  ProcessedEngineRecord,
} from './types';
import { buildActorDiscoveryQuery, buildActorPageFilter } from './build_actor_discovery_query';
import { buildTargetsPerActorQuery } from './build_targets_per_actor_query';
import { parseTargetsPerActorRows } from './parse_targets_per_actor_rows';
import { writeEntityIds } from './update_entities';
import { LOOKBACK_WINDOW, MAX_ITERATIONS } from './constants';
import { assertValidNamespace } from './validate_namespace';

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

/**
 * Detects the index-not-found case the engine recovers from gracefully (Step 1
 * runs against `logs-{integration}-{namespace}` data streams that don't exist
 * until the integration ships at least one document).
 *
 * Uses the typed `ResponseError` from `@elastic/elasticsearch` rather than
 * duck-typing two error shapes — the contract is anchored to the client we
 * actually depend on, so a future client upgrade that changes internal
 * representation surfaces as a compile-time signal rather than silent
 * failure.
 */
function isIndexNotFound(err: unknown): boolean {
  return (
    err instanceof esErrors.ResponseError && err.body?.error?.type === 'index_not_found_exception'
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

/** Returns the actor page on success, null to stop iteration (index missing or aborted), throws on real error. */
async function fetchActorPage(
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  afterKey: CompositeAfterKey | undefined,
  transportOpts: { signal: AbortSignal } | undefined,
  abortController: AbortController | undefined
): Promise<{ buckets: CompositeBucket[]; newAfterKey: CompositeAfterKey | undefined } | null> {
  try {
    const result = await esClient.search(
      { index: config.indexPattern(namespace), ...buildActorDiscoveryQuery(config, afterKey) },
      transportOpts
    );
    const aggs = result.aggregations as CompositeAggregations | undefined;
    return {
      buckets: aggs?.users?.buckets ?? [],
      newAfterKey: aggs?.users?.after_key,
    };
  } catch (err) {
    if (isIndexNotFound(err)) {
      logger.info(`[${config.id}] Index "${config.indexPattern(namespace)}" not found, skipping`);
      return null;
    }
    if (abortController?.signal.aborted) {
      logger.info(`[${config.id}] Aborted during composite aggregation`);
      return null;
    }
    logger.error(`[${config.id}] Composite aggregation failed: ${errMsg(err)}`);
    throw err;
  }
}

/** Returns the ES|QL result on success, null to stop iteration (aborted), throws on real error. */
async function fetchTargetsForActors(
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  buckets: CompositeBucket[],
  transportOpts: { signal: AbortSignal } | undefined,
  abortController: AbortController | undefined
): Promise<EsqlQueryResult | null> {
  const esqlFilter = {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: LOOKBACK_WINDOW, lt: 'now' } } },
        buildActorPageFilter(config, buckets),
      ],
    },
  };
  try {
    const result = await esClient.esql.query(
      { query: buildTargetsPerActorQuery(config, namespace), filter: esqlFilter },
      transportOpts
    );
    // Defense in depth: ES|QL responses are typed loosely on the client,
    // and a partial-success or future protocol change could omit columns/values.
    // Guarding here means the engine logs a warning and skips the page rather
    // than crashing in `parseTargetsPerActorRows` with a misleading TypeError.
    const typed = result as unknown as Partial<EsqlQueryResult>;
    if (!Array.isArray(typed.columns) || !Array.isArray(typed.values)) {
      logger.warn(
        `[${config.id}] ES|QL returned unexpected response shape (columns or values not arrays); skipping page`
      );
      return null;
    }
    return { columns: typed.columns, values: typed.values };
  } catch (err) {
    if (abortController?.signal.aborted) {
      logger.info(`[${config.id}] Aborted during ES|QL query`);
      return null;
    }
    logger.error(`[${config.id}] ES|QL query failed: ${errMsg(err)}`);
    throw err;
  }
}

async function runIntegration(
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  abortController: AbortController | undefined
): Promise<{ buckets: number; records: ProcessedEngineRecord[] }> {
  let afterKey: CompositeAfterKey | undefined;
  let iterations = 0;
  let totalBuckets = 0;
  const records: ProcessedEngineRecord[] = [];
  const transportOpts = abortController ? { signal: abortController.signal } : undefined;

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

    const actorPage = await fetchActorPage(
      config,
      esClient,
      logger,
      namespace,
      afterKey,
      transportOpts,
      abortController
    );
    if (actorPage === null) break;

    const { buckets, newAfterKey } = actorPage;
    logger.info(`[${config.id}] Found ${buckets.length} user buckets`);
    totalBuckets += buckets.length;
    if (buckets.length === 0) break;

    const esqlResult = await fetchTargetsForActors(
      config,
      esClient,
      logger,
      namespace,
      buckets,
      transportOpts,
      abortController
    );
    if (esqlResult === null) break;

    const { columns, values } = esqlResult;
    const pageRecords = parseTargetsPerActorRows(columns, values, config, logger);
    records.push(...pageRecords);
    logger.debug(`[${config.id}] Produced ${pageRecords.length} records`);

    // Composite agg's documented termination contract is "stop when after_key
    // is absent." Trust newAfterKey directly rather than inferring termination
    // from a partial-page heuristic — composite aggs can return a partial last
    // page with after_key still set in some edge cases (e.g. sub-aggregation
    // filters that drop bucket candidates).
    afterKey = newAfterKey;
  } while (afterKey);

  return { buckets: totalBuckets, records };
}

/**
 * Generic run loop for relationship maintainers.
 * Iterates over the provided integration configs and runs the composite agg +
 * ES|QL pipeline for each, collecting ProcessedEngineRecord objects.
 * After all integrations complete, writes optimistic EUIDs directly to
 * entity.relationships[relType].ids.
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
  /**
   * Count of actor EUIDs the engine produced records for, but whose entity
   * store record returned a 404 from `bulkUpdateEntity`. A 404 means the
   * actor isn't in the store yet — extraction lag, namespace mismatch, or
   * suppression. Surfaced here (rather than silently logged) so the caller
   * (task scheduler / alerting) can react when the count is sustained.
   */
  totalNotFound: number;
  /** Count of non-404 errors returned by `bulkUpdateEntity` (5xx, etc.). */
  totalWriteErrors: number;
  lastRunTimestamp: string;
}> => {
  // Defense-in-depth: namespace flows raw into eight `indexPattern(namespace)`
  // callbacks plus the Azure override fn. One guard at the engine boundary
  // is cheaper and stronger than trusting all callers.
  assertValidNamespace(namespace);

  let totalBuckets = 0;
  let totalRecords = 0;
  let totalWritten = 0;
  let totalNotFound = 0;
  let totalWriteErrors = 0;
  const allRecords: ProcessedEngineRecord[] = [];

  for (const config of integrations) {
    if (abortController?.signal.aborted) {
      logger.info('Generic maintainer aborted, skipping remaining integrations');
      break;
    }
    logger.info(`[${config.id}] Processing integration: ${config.name}`);
    const { buckets, records } = await runIntegration(
      config,
      esClient,
      logger,
      namespace,
      abortController
    );
    totalBuckets += buckets;
    totalRecords += records.length;
    allRecords.push(...records);
  }

  if (!abortController?.signal.aborted) {
    const writeResult = await writeEntityIds(crudClient, logger, allRecords);
    totalWritten = writeResult.updated;
    totalNotFound = writeResult.notFound;
    totalWriteErrors = writeResult.errors;
  } else {
    logger.info('Generic maintainer aborted, skipping entity id write');
  }

  return {
    totalBuckets,
    totalRecords,
    totalWritten,
    totalNotFound,
    totalWriteErrors,
    lastRunTimestamp: new Date().toISOString(),
  };
};
