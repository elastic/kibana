/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RelationshipsClient } from '@kbn/entity-store/server';

import type { RelationshipIntegrationConfig } from './types';
import { buildActorDiscoveryQuery } from './build_actor_discovery_query';
import { isIndexNotFound, errMsg } from './es_errors';

/** What the caller should do after the reset step. */
export type PreRunResetOutcome = 'proceed' | 'empty' | 'error';

interface TransportOptions {
  signal?: AbortSignal;
  requestTimeout?: number;
}

/**
 * Reports whether the source index holds at least one document that Step 1
 * would bucket, so a destructive reset is never committed against a source that
 * cannot repopulate it.
 *
 * Reuses `buildActorDiscoveryQuery` rather than re-deriving the filters: the
 * guard must agree with Step 1 exactly, or it could pass while Step 1 finds
 * nothing and the run still clears everything. `terminate_after: 1` stops each
 * shard at the first hit — presence is all that matters.
 *
 * A missing index or a failed request both return `false`: a stopped feed is
 * not evidence that every relationship ended.
 */
const hasRepopulatableSource = async (
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  transportOpts: TransportOptions | undefined,
  logPrefix: string
): Promise<boolean> => {
  const { query } = buildActorDiscoveryQuery(config, undefined) as {
    query: Record<string, unknown>;
  };

  try {
    const result = await esClient.search(
      {
        index: config.indexPattern(namespace),
        size: 0,
        terminate_after: 1,
        track_total_hits: 1,
        query,
      },
      transportOpts
    );
    const total = result.hits.total;
    const count = typeof total === 'number' ? total : total?.value ?? 0;
    return count > 0;
  } catch (err) {
    if (isIndexNotFound(err)) {
      logger.info(
        `${logPrefix} Index "${config.indexPattern(namespace)}" not found; skipping reset`
      );
      return false;
    }
    logger.error(`${logPrefix} Could not verify source before reset: ${errMsg(err)}`);
    return false;
  }
};

/**
 * Clears every relationship key the config writes, for the configured entity
 * source. Returns the entity documents updated and matched, summed across keys,
 * or throws on transport failure (caller handles the error and skips the
 * integration).
 */
const clearConfiguredRelationships = async (
  config: RelationshipIntegrationConfig,
  entitySource: string,
  relationshipsClient: RelationshipsClient,
  signal: AbortSignal | undefined
): Promise<{ updated: number; total: number }> => {
  const relationshipKeys =
    config.kind === 'bucketed'
      ? [
          config.bucketTargetByThreshold.aboveThresholdRelationship,
          config.bucketTargetByThreshold.belowThresholdRelationship,
        ]
      : [config.relationshipKey];

  const cleared = { updated: 0, total: 0 };
  for (const relationshipKey of relationshipKeys) {
    const { updated, total } = await relationshipsClient.clearRelationshipIds({
      entitySource,
      relationshipKey,
      signal,
    });

    cleared.updated += updated;
    cleared.total += total;
  }
  return cleared;
};

/**
 * Applies `resetRelationshipsBeforeRun` when configured. Returns `'proceed'`
 * when the run should continue (including when no reset is configured), or the
 * outcome the integration should terminate with.
 *
 * The reset is destructive and is only justified by the repopulation that
 * follows it, so the source is verified first: a missing index, an unreachable
 * cluster, or a feed that stopped longer ago than the lookback window would
 * otherwise wipe every relationship with nothing left to restore it.
 */
export const preRunReset = async (
  config: RelationshipIntegrationConfig,
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  relationshipsClient: RelationshipsClient,
  signal: AbortSignal | undefined,
  transportOpts: TransportOptions | undefined,
  logPrefix: string
): Promise<PreRunResetOutcome> => {
  if (!config.resetRelationshipsBeforeRun) return 'proceed';
  const { entitySource } = config.resetRelationshipsBeforeRun;

  const sourceIsUsable = await hasRepopulatableSource(
    config,
    esClient,
    logger,
    namespace,
    transportOpts,
    logPrefix
  );
  if (!sourceIsUsable) {
    logger.warn(
      `${logPrefix} Skipping reset and integration: source yielded no documents to repopulate from. ` +
        `Existing ${entitySource} relationships are left untouched.`
    );
    return 'empty';
  }

  const clearStartMs = Date.now();
  try {
    const { updated, total } = await clearConfiguredRelationships(
      config,
      entitySource,
      relationshipsClient,
      signal
    );
    logger.debug(
      `${logPrefix} [pre-run-reset] clearConfiguredRelationships done ` +
        `updated=${updated} total=${total} durationMs=${Date.now() - clearStartMs}`
    );
    logger.info(
      `${logPrefix} Pre-run reset cleared relationships on ${updated} of ${total} matched ${entitySource} entities`
    );
    return 'proceed';
  } catch (err) {
    logger.debug(
      `${logPrefix} [pre-run-reset] clearConfiguredRelationships failed ` +
        `durationMs=${Date.now() - clearStartMs} error=${errMsg(err)}`
    );
    // Populating on top of a half-cleared state is worse than leaving the
    // previous run's data in place, so skip this integration entirely.
    logger.error(`${logPrefix} Relationship reset failed, skipping integration: ${errMsg(err)}`);
    return 'error';
  }
};
